import assert from 'node:assert/strict';
import test from 'node:test';
import { PassThrough, Writable } from 'node:stream';
import { setImmediate } from 'node:timers/promises';
import { BoundedStdioTransport } from '../src/stdio.js';
import { DEFAULT_MCP_LIMITS } from '../src/limits.js';

test('stdio parses split UTF-8 frames and reports malformed JSON without dispatching it', async () => {
  const input = new PassThrough(), output = new PassThrough();
  const transport = new BoundedStdioTransport(input, DEFAULT_MCP_LIMITS, output);
  const received: unknown[] = [], replies: string[] = [];
  transport.onmessage = value => { received.push(value); };
  output.on('data', data => { replies.push(data.toString()); });
  await transport.start();
  try {
    const frame = Buffer.from('{"value":"é"}\n');
    input.write(frame.subarray(0, 10)); input.write(frame.subarray(10));
    input.write('{\n');
    await setImmediate();
    assert.deepEqual(received, [{ value: 'é' }]);
    assert.equal(JSON.parse(replies[0]!).error.code, -32700);
    input.end(); await setImmediate();
    assert.equal(input.listenerCount('error'), 0);
    await assert.rejects(transport.send({}), /not running/);
  } finally { await transport.close(); }
});

test('stdio closes a bounded output queue and drains pending write errors safely', async () => {
  const input = new PassThrough();
  let complete!: (error?: Error | null) => void;
  const output = new Writable({ highWaterMark: 1, write(_chunk, _encoding, callback) { complete = callback; } });
  const transport = new BoundedStdioTransport(input, { ...DEFAULT_MCP_LIMITS, responseBytes: 32, concurrency: 1 }, output);
  let closed = 0;
  transport.onclose = () => { closed++; };
  transport.onerror = () => { throw new Error('observer failure'); };
  await transport.start();
  const first = assert.rejects(transport.send({ value: '12345678901234567890' }), /closed/);
  await assert.rejects(transport.send({ value: '12345678901234567890' }), /output limit/);
  await first;
  complete(new Error('late output failure'));
  await setImmediate(); await setImmediate();
  assert.equal(closed, 1);
  assert.equal(output.listenerCount('error'), 0);
  assert.equal(input.listenerCount('error'), 0);
});

test('stdio send waits for the writable callback and leaves shared output open', async () => {
  let complete!: (error?: Error | null) => void;
  const output = new Writable({ highWaterMark: 1, write(_chunk, _encoding, callback) { complete = callback; } });
  const transport = new BoundedStdioTransport(new PassThrough(), DEFAULT_MCP_LIMITS, output);
  await transport.start();
  let sent = false;
  const pending = transport.send({ jsonrpc: '2.0', id: 1, result: {} }).then(() => { sent = true; });
  await setImmediate(); assert.equal(sent, false);
  complete(); await pending;
  await transport.close(); await setImmediate();
  assert.equal(output.destroyed, false);
  assert.equal(output.listenerCount('error'), 0);
});
