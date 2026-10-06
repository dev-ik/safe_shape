import assert from 'node:assert/strict';
import test from 'node:test';
import { object, string } from '@safe-shape/core';
import { createValidatedMcpHandler, defineMcpTool } from '../src/index.js';
import { ExecutionGate, resolveLimits } from '../src/limits.js';

test('deadline keeps capacity charged until callback settles', async () => {
  const gate = new ExecutionGate(resolveLimits({ concurrency: 1, deadlineMs: 10 }));
  let settle!: () => void;
  const first = gate.run(() => new Promise<void>(resolve => { settle = resolve; }));
  await assert.rejects(first, /deadline/);
  await assert.rejects(gate.run(async () => 1), /capacity/);
  settle(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(await gate.run(async () => 2), 2);
});

test('cancellation after input validation blocks business handler', async () => {
  const controller = new AbortController(); let calls = 0;
  const input = object({ text: string() }).refineAsync(async () => { controller.abort(); return true; }, { id: 'abort' });
  const tool = defineMcpTool({ name: 'abort', description: 'Abort input', input, output: object({}) });
  const result = await createValidatedMcpHandler(tool, () => { calls++; return {}; })({ text: 'x' }, { signal: controller.signal });
  assert.equal(result.isError, true); assert.equal(calls, 0);
});

test('size limits reject results and invalid limit configuration', async () => {
  const tool = defineMcpTool({ name: 'size', description: 'Size', input: object({}), output: object({ text: string() }) });
  const result = await createValidatedMcpHandler(tool, () => ({ text: 'x'.repeat(1024) }), { responseBytes: 512 })({});
  assert.equal(result.isError, true);
  for (const value of [0, -1, NaN, Infinity, 0.1]) assert.throws(() => resolveLimits({ concurrency: value }), TypeError);
});
