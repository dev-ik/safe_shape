import assert from "node:assert/strict";
import test from "node:test";
import { array, describeContract, describeOutputBound, intersection, lazy, number, object, string, type Schema } from "../src/index.js";

test("checked bounds are separate from exact graphs and execute no callbacks", () => {
  let calls = 0;
  const page = string().transform(() => { calls++; return 2; }).pipe(number({ minimum: 1, maximum: 10 }));
  const bound = describeOutputBound(page);
  assert.equal(calls, 0);
  assert.equal(bound.format, "safe-shape.output-bound/v1");
  assert.deepEqual(bound.graph.root, { kind: "number", constraints: { minimum: 1, maximum: 10 } });
  assert.ok(Object.isFrozen(bound.graph.root));
  assert.ok(Object.isFrozen(bound.graph.definitions));
  assert.ok(describeContract(page).output.root.refinements?.includes(null));
  assert.equal(page.parse("2"), 2);
  assert.equal(calls, 1);
});

test("bounds preserve real restrictions, final opacity and output key policies", () => {
  const pipeline = string().transform(Number).pipe(number());
  assert.equal(describeOutputBound(pipeline.transform(String)).graph.root.kind, "opaque");
  assert.deepEqual(describeOutputBound(pipeline.refine(() => true, { id: "rule" })).graph.root.refinements, ["rule"]);
  const bound = describeOutputBound(object({ ["__proto__"]: pipeline }, { unknownProperties: "strip" })).graph.root;
  assert.equal(bound.kind, "object");
  if (bound.kind === "object") {
    assert.equal(bound.unknownProperties, "reject");
    assert.equal(Object.getOwnPropertyDescriptor(bound.shape, "__proto__")?.value.kind, "number");
  }
  assert.equal(describeOutputBound(intersection(object({}), object({}))).graph.root.kind, "opaque");
});

test("recursive checked bounds retain references and resolve once", () => {
  interface Node { value: number; children: readonly Node[] }
  let node: Schema<Node, unknown>;
  node = lazy(() => object({ value: string().transform(Number).pipe(number()), children: array(node) }), { id: "Node" });
  const bound = describeOutputBound(node);
  assert.equal(bound.graph.root.kind, "reference");
  const definition = bound.graph.definitions.Node;
  assert.equal(definition?.kind, "object");
  if (definition?.kind === "object") assert.equal(definition.shape.value?.kind, "number");
});

test("root async cache cannot be poisoned by partial recursive discovery", async () => {
  let a: Schema<unknown>, b: Schema<unknown>;
  a = lazy(() => object({ next: b.optional(), async: string().refineAsync(async () => true, { id: "async" }) }), { id: "a" });
  b = lazy(() => object({ next: a.optional() }), { id: "b" });
  assert.throws(() => a.safeParse({}), /async rules/);
  for (let i = 0; i < 3; i++) {
    assert.throws(() => b.safeParse({}), /async rules/);
    assert.equal((await b.safeParseAsync({})).success, true);
    assert.ok(b["~standard"].validate({}) instanceof Promise);
  }
  const sync = string();
  sync.parse("a");
  const async = sync.refineAsync(async () => true, { id: "later" });
  assert.throws(() => async.parse("a"), /async rules/);
  assert.equal(sync.parse("a"), "a");
});

test("failed lazy discovery is retried and no-check layers retain warnings", () => {
  let attempts = 0;
  const value = lazy(() => { if (++attempts === 1) throw new Error("retry"); return string(); }, { id: "retry" });
  assert.throws(() => value.parse("a"), /retry/);
  assert.equal(value.parse("a"), "a");
  const wrapped = string().warn(() => false, { id: "notice" }).nullable().optional();
  const result = wrapped.safeParse("a");
  assert.ok(result.success);
  assert.equal(result.warnings?.[0]?.ruleId, "notice");
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.warnings));
});
