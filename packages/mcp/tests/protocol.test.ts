import assert from 'node:assert/strict';
import test from 'node:test';
import { setImmediate } from 'node:timers/promises';
import { object, string } from '@safe-shape/core';
import { createMcpContractRegistry, createSafeShapeMcpServer } from '../src/index.js';

function transport() {
  const sent: any[] = [];
  const wire: any = {
    onmessage: undefined, onclose: undefined, onerror: undefined,
    async start() {}, async send(message: unknown) { sent.push(structuredClone(message)); },
    async close() { wire.onclose?.(); },
  };
  return { wire, sent, async receive(message: unknown) { wire.onmessage?.(message); await setImmediate(); } };
}
const initialize = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'wire-test', version: '1' } } };

test('protocol requires initialization and negotiates the explicit tools-only baseline', async () => {
  const server = createSafeShapeMcpServer({ registry: createMcpContractRegistry([]) });
  const io = transport();
  await server.connect(io.wire);
  try {
    await io.receive({ jsonrpc: '2.0', id: 0, method: 'tools/list' });
    assert.equal(io.sent.at(-1).error.code, -32000);
    await io.receive(initialize);
    assert.equal(io.sent.at(-1).result.protocolVersion, '2025-06-18');
    assert.deepEqual(io.sent.at(-1).result.capabilities, { tools: {} });
    await io.receive({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    assert.equal(io.sent.at(-1).error.code, -32000);
    await io.receive({ jsonrpc: '2.0', method: 'notifications/initialized' });
    await io.receive({ jsonrpc: '2.0', id: 3, method: 'tools/list' });
    assert.equal(io.sent.at(-1).result.tools.length, 6);
    await io.receive({ jsonrpc: '2.0', id: 4, method: 'missing' });
    assert.equal(io.sent.at(-1).error.code, -32601);
  } finally { await server.close(); }
});

test('protocol rejects malformed requests and never replies to notifications', async () => {
  const server = createSafeShapeMcpServer({ registry: createMcpContractRegistry([]) });
  const io = transport();
  await server.connect(io.wire);
  try {
    await io.receive({ jsonrpc: '1.0', id: 0, method: 'ping' });
    assert.equal(io.sent.at(-1).error.code, -32600);
    const count = io.sent.length;
    await io.receive({ jsonrpc: '2.0', method: 'tools/call', params: { name: 'bad' } });
    await io.receive({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: {} } });
    assert.equal(io.sent.length, count);
    await io.receive(initialize);
    await io.receive({ jsonrpc: '2.0', method: 'notifications/initialized' });
    await io.receive({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'validate_data', arguments: [] } });
    assert.equal(io.sent.at(-1).error.code, -32602);
  } finally { await server.close(); }
});

test('cancellation suppresses late replies and keeps unfinished callbacks in their slot', async () => {
  let release!: () => void, entered!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  const schema = object({ name: string() }).refineAsync(async () => { entered(); await blocked; return true; }, { id: 'blocked' });
  const server = createSafeShapeMcpServer({ registry: createMcpContractRegistry([{ id: 'user', description: 'User', schema }]), limits: { concurrency: 1 } });
  const io = transport();
  await server.connect(io.wire);
  try {
    await io.receive(initialize);
    await io.receive({ jsonrpc: '2.0', method: 'notifications/initialized' });
    const call = { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'validate_data', arguments: { contractId: 'user', value: { name: 'Ada' } } } };
    await io.receive(call); await started;
    await io.receive({ jsonrpc: '2.0', method: 'notifications/cancelled', params: { requestId: 2 } });
    await io.receive({ ...call, id: 3 });
    assert.equal(io.sent.find(value => value.id === 3).result.structuredContent.error.code, 'capacity_exceeded');
    release(); await setImmediate();
    assert.equal(io.sent.some(value => value.id === 2), false);
    await server.close(); await server.close();
    assert.equal(io.wire.onmessage, undefined);
  } finally { release(); await server.close(); }
});

test('protocol negotiates unknown revisions and rejects duplicate initialization', async () => {
  const server = createSafeShapeMcpServer({ registry: createMcpContractRegistry([]) });
  const io = transport(); await server.connect(io.wire);
  try {
    await io.receive({ ...initialize, params: { ...initialize.params, protocolVersion: 'unknown' } });
    assert.equal(io.sent.at(-1).result.protocolVersion, '2025-06-18');
    await io.receive({ ...initialize, id: 2 });
    assert.equal(io.sent.at(-1).error.code, -32600);
    await assert.rejects(server.connect(transport().wire), /only once/);
  } finally { await server.close(); }
});

test('duplicate active IDs are rejected and closing suppresses pending replies', async () => {
  let release!: () => void;
  const blocked = new Promise<void>(resolve => { release = resolve; });
  const schema = object({ name: string() }).refineAsync(async () => { await blocked; return true; }, { id: 'shutdown' });
  const server = createSafeShapeMcpServer({ registry: createMcpContractRegistry([{ id: 'user', description: 'User', schema }]) });
  const io = transport(); await server.connect(io.wire);
  try {
    await io.receive(initialize);
    await io.receive({ jsonrpc: '2.0', method: 'notifications/initialized' });
    const call = { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'validate_data', arguments: { contractId: 'user', value: { name: 'Ada' } } } };
    await io.receive(call); await io.receive(call);
    assert.equal(io.sent.at(-1).error.code, -32600);
    const count = io.sent.length;
    await server.close(); release(); await setImmediate();
    assert.equal(io.sent.length, count);
    assert.equal(io.wire.onmessage, undefined);
  } finally { release(); await server.close(); }
});
