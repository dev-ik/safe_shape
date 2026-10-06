import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import * as api from '../src/index.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { loadMcpManifest } from '../src/manifest.js';
import { existsSync } from 'node:fs';

test('stdio loads explicit manifest and shuts down without non-protocol stdout', async () => {
  assert.ok((api as any).createSafeShapeMcpServer);
  const root = resolve('../..');
  const directory = await mkdtemp(join(root, '.tmp/mcp-'));
  try {
    await writeFile(join(directory, 'schema.mjs'), `import {object,string} from '@safe-shape/core'; export default object({name:string()});`);
    await writeFile(join(directory, 'manifest.json'), JSON.stringify({ version: 1, contracts: [{ id: 'user', description: 'User', module: './schema.mjs' }] }));
    const transport = new StdioClientTransport({ command: process.execPath, args: [join(root, 'packages/mcp/dist/cli.js'), '--workspace', directory, '--manifest', 'manifest.json'], stderr: 'pipe' });
    let errors = '';
    transport.stderr?.on('data', chunk => { errors += String(chunk); });
    const client = new Client({ name: 'stdio-test', version: '1' });
    await client.connect(transport);
    try {
      assert.equal((await client.listTools()).tools.length, 6);
      const result = await client.callTool({ name: 'validate_data', arguments: { contractId: 'user', value: { name: 'Ada' } } });
      assert.equal((result.structuredContent as any).result.valid, true);
    } finally { await client.close(); }
    assert.equal(errors, '');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('manifest rejects escapes, symlinks, invalid references and duplicate IDs before any import', async () => {
  const root = resolve('../..');
  const directory = await mkdtemp(join(root, '.tmp/mcp-path-'));
  const outside = await mkdtemp(join(root, '.tmp/mcp-outside-'));
  const marker = join(directory, 'executed');
  try {
    await writeFile(join(directory, 'effect.mjs'), `import {writeFileSync} from 'node:fs';writeFileSync(${JSON.stringify(marker)},'yes');export default {};`);
    await writeFile(join(outside, 'outside.mjs'), 'throw new Error("secret");');
    await symlink(join(outside, 'outside.mjs'), join(directory, 'link.mjs'));
    const entry = { id: 'first', description: 'First', module: 'effect.mjs' };
    const check = async (value: unknown) => {
      await writeFile(join(directory, 'manifest.json'), JSON.stringify(value));
      await assert.rejects(loadMcpManifest(directory, 'manifest.json'));
      assert.equal(existsSync(marker), false);
    };
    await check({ version: 1, contracts: [entry, { ...entry, id: 'second', module: join(outside, 'outside.mjs') }] });
    await check({ version: 1, contracts: [entry, { ...entry, id: 'second', module: 'link.mjs' }] });
    await check({ version: 1, contracts: [entry, entry] });
    await check({ version: 1, contracts: [entry], tools: [{ id: 't', name: 't', description: 'Tool', inputId: 'missing', outputId: 'first' }] });
    await check({ version: 1, contracts: [{ ...entry, description: '   ' }] });
  } finally { await rm(directory, { recursive: true, force: true }); await rm(outside, { recursive: true, force: true }); }
});
