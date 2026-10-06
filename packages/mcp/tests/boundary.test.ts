import assert from "node:assert/strict";
import test from "node:test";
import { object, string, number, unknown as unknownSchema, lazy } from "@safe-shape/core";
import * as api from "../src/index.js";
import { ToolSchema } from '@modelcontextprotocol/sdk/types.js';

test("application boundaries block invalid arguments/results and exceptions", async () => {
  const { defineMcpTool, createValidatedMcpHandler, safeToMcpToolDefinition } = api as any;
  assert.equal(typeof defineMcpTool, "function");
  const tool = defineMcpTool({ name: "length", description: "Find length", input: object({ text: string() }), output: object({ length: number() }) });
  let calls = 0;
  const handler = createValidatedMcpHandler(tool, ({ text }: {text: string}) => { calls++; return { length: text.length }; });
  assert.equal((await handler({ text: 5 })).isError, true);
  assert.equal(calls, 0);
  assert.deepEqual((await handler({ text: "abc" })).structuredContent, { length: 3 });
  assert.equal(calls, 1);
  const broken = await createValidatedMcpHandler(tool, () => ({ length: "bad" }))({ text: "x" });
  assert.equal(broken.isError, true); assert.equal(broken.structuredContent, undefined);
  assert.equal(Object.isFrozen(broken.content), true);
  const thrown = await createValidatedMcpHandler(tool, () => { throw new Error("secret-token"); })({ text: "x" });
  assert.equal(thrown.isError, true); assert.ok(!JSON.stringify(thrown).includes("secret-token"));
  assert.equal(safeToMcpToolDefinition(tool).success, true);
  assert.equal(safeToMcpToolDefinition(defineMcpTool({ ...tool, input: string() })).success, false);
  const refined = object({ text: string() }).refine(() => true, { id: "opaque" });
  assert.equal(safeToMcpToolDefinition(defineMcpTool({ ...tool, input: refined })).success, false);
  const recursive: any = lazy(() => object({ next: recursive.optional() }), { id: "node" });
  const recursiveDefinition = safeToMcpToolDefinition(defineMcpTool({ ...tool, input: recursive, output: recursive }));
  assert.equal(recursiveDefinition.success, true);
  assert.equal(ToolSchema.safeParse(recursiveDefinition.definition).success, true);
});

test('adapter preserves native payload mutability and identity', async () => {
  const payload = { items: [] as number[] };
  const input = object({ data: unknownSchema() });
  assert.equal(Object.isFrozen(input.parse({ data: payload }).data), false);
  const tool = api.defineMcpTool({ name: 'mutable', description: 'Mutable payload', input, output: object({ data: unknownSchema() }) });
  const result = await api.createValidatedMcpHandler(tool, value => {
    assert.equal(value.data, payload);
    (value.data as typeof payload).items.push(1);
    return value;
  })({ data: payload });
  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent!.data, payload);
  assert.equal(Object.isFrozen(payload.items), false);
});

test('safe export contains artifact serialization failures', () => {
  let nested: any = string();
  for (let i = 0; i < 65; i++) nested = object({ value: nested });
  const tool = api.defineMcpTool({ name: 'deep_schema', description: 'Deep schema', input: nested, output: nested });
  let result: any;
  assert.doesNotThrow(() => { result = api.safeToMcpToolDefinition(tool); });
  assert.equal(result.success, false);
  assert.equal(result.issues[0].code, 'mcp.profile.serialization_failed');
});

test('configured depth accounts for protocol wrappers without reverting to 128', async () => {
  let value: any = {};
  for (let i = 0; i < 135; i++) value = { value };
  const tool = api.defineMcpTool({ name: 'deep', description: 'Deep payload', input: object({ data: unknownSchema() }), output: object({ data: unknownSchema() }) });
  const result = await api.createValidatedMcpHandler(tool, v => v, { depth: 200 })({ data: value });
  assert.equal(result.isError, undefined);
});

test("runtime transformations, async checks, warnings and cancellation are explicit", async () => {
  const { defineMcpTool, createValidatedMcpHandler } = api as any;
  assert.equal(typeof defineMcpTool, "function");
  const input = object({ text: string().transform(v => v.length) }).warn(() => false, { id: "notice", message: "Notice" }).refineAsync(async () => true, { id: "async" });
  const tool = defineMcpTool({ name: "transform", description: "Transform input", input, output: object({ length: number() }) });
  const call = createValidatedMcpHandler(tool, ({ text }: {text: number}) => ({ length: text }));
  const result = await call({ text: "abc" });
  assert.deepEqual(result.structuredContent, { length: 3 });
  assert.equal(result._meta['safe-shape/warnings'].input.length, 1);
  const controller = new AbortController(); controller.abort();
  assert.equal((await call({ text: "abc" }, { signal: controller.signal })).isError, true);
});

test("lossless JSON rejects runtime values without invoking accessors or toJSON", async () => {
  const { defineMcpTool, createValidatedMcpHandler } = api as any;
  assert.equal(typeof defineMcpTool, "function");
  const tool = defineMcpTool({ name: "json", description: "JSON", input: object({}), output: object({ value: unknownSchema() }) });
  const cycle: any = {}; cycle.self = cycle;
  let reads = 0; const getter = Object.defineProperty({}, "x", { enumerable: true, get() { reads++; return 1; } });
  const hidden = Object.defineProperty({}, "x", { value: 1 });
  const symbols = { [Symbol('x')]: 1 };
  for (const value of [NaN, Infinity, undefined, 1n, new Date(), cycle, getter, hidden, symbols, new Array(2), { toJSON() { reads++; return 1; } }]) {
    const result = await createValidatedMcpHandler(tool, () => ({ value }))({});
    assert.equal(result.isError, true); assert.equal(result.structuredContent, undefined);
  }
  assert.equal(reads, 0);
  const result = await createValidatedMcpHandler(tool, () => ({ value: JSON.parse('{"__proto__":1}') }))({});
  assert.equal(result.isError, undefined);
});
