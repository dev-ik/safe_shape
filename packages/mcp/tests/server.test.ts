import assert from 'node:assert/strict';
import test from 'node:test';
import { object, string, number } from '@safe-shape/core';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import * as api from '../src/index.js';

test('SDK client discovers six tools and performs export/invalid/corrected/compare workflow', async () => {
  const create = (api as any).createSafeShapeMcpServer;
  assert.equal(typeof create, 'function');
  const registry = api.createMcpContractRegistry([
    { id: 'before', description: 'Previous', schema: object({ name: string() }) },
    { id: 'after', description: 'Next', schema: object({ name: string(), age: number().optional() }) },
  ], [{ id: 'tool', name: 'user', description: 'User tool', inputId: 'before', outputId: 'after' }]);
  const server = create({ registry });
  const client = new Client({ name: 'test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a); await client.connect(b);
  try {
    const tools = await client.listTools();
    assert.equal(tools.tools.length, 6);
    assert.ok(tools.tools.every(t => t.outputSchema && t.inputSchema));
    const call = async (name: string, args: Record<string, unknown> = {}) => {
      const result = await client.callTool({ name, arguments: args });
      const structured = result.structuredContent as any;
      assert.deepEqual(JSON.parse((result.content as any)[0].text), structured);
      return { result, data: structured };
    };
    assert.equal((await call('list_contracts')).data.result.contracts[0].id, 'after');
    assert.equal((await call('describe_contract', { contractId: 'before' })).data.result.contract.format, 'safe-shape.contract-ir/v2');
    assert.equal((await call('export_json_schema', { contractId: 'before' })).data.result.schema.type, 'object');
    const invalid = await call('validate_data', { contractId: 'before', value: { name: 42 } });
    assert.equal(invalid.data.ok, true); assert.equal(invalid.data.result.valid, false);
    assert.equal(invalid.result.isError, undefined);
    assert.deepEqual(invalid.data.result.issues[0].path, ['name']);
    assert.equal((await call('validate_data', { contractId: 'before', value: { name: 'Ada' } })).data.result.valid, true);
    assert.equal((await call('compare_contracts', { previousId: 'before', nextId: 'after' })).data.result.migration.decision, 'compatible');
    assert.equal((await call('export_tool_definition', { toolId: 'tool' })).data.result.definition.name, 'user');
    assert.equal((await call('describe_contract', { contractId: 'missing' })).result.isError, true);
    await assert.rejects(client.callTool({ name: 'validate_data', arguments: { contractId: 'before', value: {}, module: '/tmp/evil.js' } }));
    const first = await call('list_contracts', { limit: 1 });
    const second = await call('list_contracts', { limit: 1, cursor: first.data.result.nextCursor });
    assert.equal(second.data.result.contracts[0].id, 'before');
    assert.equal((await call('list_contracts', { cursor: 'stale' })).result.isError, true);
  } finally { await client.close(); await server.close(); }
});
