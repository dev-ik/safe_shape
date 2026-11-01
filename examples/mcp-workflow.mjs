import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

// Independent MCP wire smoke test; no client SDK is installed or imported.
const command = process.argv[2] ?? resolve('node_modules/.bin/safe-shape-mcp');
const child = spawn(command, [...(process.argv[3] ? [process.argv[3]] : []), '--workspace', process.cwd(), '--manifest', 'examples/mcp.manifest.json'], { stdio: ['pipe', 'pipe', 'pipe'] });
let stderr = '', nextId = 1;
const pending = new Map();
const fail = error => { for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(error); } pending.clear(); };
const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
child.stderr.setEncoding('utf8'); child.stderr.on('data', text => { stderr += text; });
child.on('error', fail);
const exited = new Promise(accept => child.once('exit', (code, signal) => { fail(new Error('MCP process closed')); accept({ code, signal }); }));
lines.on('line', line => {
  try {
    const reply = JSON.parse(line);
    assert.equal(reply.jsonrpc, '2.0');
    const entry = pending.get(reply.id);
    if (!entry) return;
    pending.delete(reply.id); clearTimeout(entry.timer);
    if (reply.error) entry.reject(new Error(reply.error.message)); else entry.resolve(reply.result);
  } catch (error) { fail(error); }
});
const send = message => new Promise((accept, reject) => child.stdin.write(JSON.stringify(message) + '\n', error => error ? reject(error) : accept()));
const request = (method, params) => {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('MCP request timed out')); }, 5000);
    pending.set(id, { resolve, reject, timer });
    void send({ jsonrpc: '2.0', id, method, ...(params === undefined ? {} : { params }) }).catch(error => { pending.delete(id); clearTimeout(timer); reject(error); });
  });
};
try {
  const initialized = await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'safe-shape-example', version: '1.0.0' } });
  assert.equal(initialized.protocolVersion, '2025-06-18');
  assert.deepEqual(initialized.capabilities, { tools: {} });
  await send({ jsonrpc: '2.0', method: 'notifications/initialized' });
  assert.equal((await request('tools/list')).tools.length, 6);
  const call = async (name, args = {}) => {
    const reply = await request('tools/call', { name, arguments: args });
    assert.notEqual(reply.isError, true);
    assert.deepEqual(JSON.parse(reply.content[0].text), reply.structuredContent);
    return reply.structuredContent.result;
  };
  assert.equal((await call('list_contracts')).contracts.length, 2);
  assert.equal((await call('export_json_schema', { contractId: 'user-v1' })).schema.type, 'object');
  assert.equal((await call('validate_data', { contractId: 'user-v1', value: { name: 42 } })).valid, false);
  assert.equal((await call('validate_data', { contractId: 'user-v1', value: { name: 'Ada' } })).valid, true);
  assert.equal((await call('compare_contracts', { previousId: 'user-v1', nextId: 'user-v2' })).migration.decision, 'compatible');
  assert.equal((await call('export_tool_definition', { toolId: 'user-tool' })).definition.name, 'inspect_user');
} finally {
  fail(new Error('Smoke test finished'));
  child.stdin.end();
  const timer = setTimeout(() => child.kill('SIGKILL'), 3000);
  try { if (child.pid) { const status = await exited; assert.equal(status.code, 0, stderr); } }
  finally { clearTimeout(timer); lines.close(); }
}
assert.equal(stderr, '');
console.log('mcp-workflow: ok (independent JSON-RPC wire client; not a real-agent walkthrough)');
