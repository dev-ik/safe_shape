import assert from 'node:assert/strict';
import test from 'node:test';
import { Readable } from 'node:stream';

test('framing enforces byte/depth limits before SDK parsing across chunks', async () => {
  let framing: any;
  try { framing = await import('../src/stdio.js' as string); } catch {}
  assert.equal(typeof framing?.createBoundedInput, 'function');
  const read = async (chunks: string[], bytes: number, depth: number) => {
    let output = '';
    for await (const chunk of Readable.from(chunks).pipe(framing.createBoundedInput(bytes, depth))) output += chunk;
    return output;
  };
  assert.equal(await read(['{"s":"[\\\"', ']"}\n'], 100, 1), '{"s":"[\\\"]"}\n');
  assert.equal(await read(['{"x":"é"}\n'], 100, 1), '{"x":"é"}\n');
  await assert.rejects(read(['123', '456\n'], 5, 10), /limit/);
  await assert.rejects(read(['[[', '[]]]\n'], 100, 2), /limit/);
  await assert.rejects(read(['123456'], 5, 10), /limit/);
});
