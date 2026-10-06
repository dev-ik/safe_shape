import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import * as dedicated from '@safe-shape/mcp';

test('MCP subpath exposes the dedicated package without polluting root exports', async () => {
  let mcp: any;
  try { mcp = await import('safe-shape/mcp' as string); } catch {}
  assert.equal(typeof mcp?.defineMcpTool, 'function');
  for (const key of Object.keys(dedicated)) assert.equal(mcp[key], (dedicated as any)[key]);
  const root = await import('safe-shape');
  assert.equal('defineMcpTool' in root, false);
});

test('ordinary umbrella import never resolves the MCP package or SDK', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'safe-shape-loader-'));
  const loader = join(directory, 'loader.mjs');
  try {
    await writeFile(loader, `export async function resolve(specifier, context, next) {
      if (specifier === '@safe-shape/mcp' || specifier.startsWith('@modelcontextprotocol/')) throw new Error('Unexpected MCP dependency loading');
      return next(specifier, context);
    }`);
    const result = spawnSync(process.execPath, ['--loader', loader, '--input-type=module', '--eval', 'const s = await import("safe-shape"); if (typeof s.object !== "function") throw new Error("Missing runtime API");'], { encoding: 'utf8', cwd: process.cwd() });
    assert.equal(result.status, 0, result.stderr);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
