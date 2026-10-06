import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
// Accept an installed executable override for tarball consumer checks.
const command = process.argv[2] ?? resolve('node_modules/.bin/safe-shape-mcp');
const client = new Client({ name: 'safe-shape-example', version: '1.0.0' });
const transport = new StdioClientTransport({ command, args: ['--workspace', process.cwd(), '--manifest', 'examples/mcp.manifest.json'], stderr: 'pipe' });
let stderr = ''; transport.stderr?.on('data', chunk => { stderr += chunk; });
await client.connect(transport);
try {
  assert.equal((await client.listTools()).tools.length, 6);
  const call = async (name, args = {}) => {
    const reply = await client.callTool({ name, arguments: args });
    assert.notEqual(reply.isError, true);
    return reply.structuredContent.result;
  };
  assert.equal((await call('list_contracts')).contracts.length, 2);
  assert.equal((await call('export_json_schema', { contractId: 'user-v1' })).schema.type, 'object');
  assert.equal((await call('validate_data', { contractId: 'user-v1', value: { name: 42 } })).valid, false);
  assert.equal((await call('validate_data', { contractId: 'user-v1', value: { name: 'Ada' } })).valid, true);
  assert.equal((await call('compare_contracts', { previousId: 'user-v1', nextId: 'user-v2' })).migration.decision, 'compatible');
  assert.equal((await call('export_tool_definition', { toolId: 'user-tool' })).definition.name, 'inspect_user');
} finally { await client.close(); }
assert.equal(stderr, '');
console.log('mcp-workflow: ok (SDK client; not a real-agent walkthrough)');
