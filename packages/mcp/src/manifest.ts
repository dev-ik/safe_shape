import { readFile, realpath } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';
import { object, string, array, literal, integer } from '@safe-shape/core';
import { createMcpContractRegistry } from './registry.js';
import { resolveLimits } from './limits.js';
const text = string({ minLength: 1, pattern: "\\S" });
const id = string({ minLength: 1, maxLength: 128 });
const positive = integer({ minimum: 1 });
const schema = object({
  version: literal(1),
  contracts: array(object({ id, description: text, module: text, export: text.optional() })),
  tools: array(object({ id, name: id, description: text, inputId: id, outputId: id })).optional(),
  limits: object({ requestBytes: positive.optional(), depth: positive.optional(), responseBytes: positive.optional(), concurrency: positive.optional(), deadlineMs: positive.optional() }).optional(),
});
async function contained(root: string, path: string): Promise<string> {
  const canonical = await realpath(path);
  const difference = relative(root, canonical);
  if (difference === '..' || difference.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) || isAbsolute(difference)) throw new TypeError('Path outside workspace.');
  return canonical;
}
export async function loadMcpManifest(workspace: string, manifest: string) {
  const root = await realpath(resolve(workspace));
  const path = await contained(root, resolve(root, manifest));
  const parsed = schema.safeParse(JSON.parse(await readFile(path, 'utf8')));
  if (!parsed.success) throw new TypeError('Invalid MCP manifest.');
  const data = parsed.data;
  const limits = resolveLimits(data.limits);
  const ids = new Set<string>();
  for (const entry of data.contracts) { if (!entry.id.trim() || ids.has(entry.id)) throw new TypeError('Invalid contract ID.'); ids.add(entry.id); }
  const toolIds = new Set<string>(); const names = new Set<string>();
  for (const entry of data.tools ?? []) {
    if (!entry.id.trim() || !/^[A-Za-z0-9_.-]+$/.test(entry.name) || toolIds.has(entry.id) || names.has(entry.name) || !ids.has(entry.inputId) || !ids.has(entry.outputId)) throw new TypeError('Invalid tool catalog.');
    toolIds.add(entry.id); names.add(entry.name);
  }
  // Validate every entry path before importing any trusted code.
  const paths = await Promise.all(data.contracts.map(entry => contained(root, resolve(root, entry.module))));
  const entries = [];
  for (let i = 0; i < data.contracts.length; i++) {
    const entry = data.contracts[i]!;
    const module = await import(pathToFileURL(paths[i]!).href) as Record<string, unknown>;
    const name = entry.export ?? 'default';
    if (!Object.hasOwn(module, name)) throw new TypeError('Missing schema export.');
    entries.push({ id: entry.id, description: entry.description, schema: module[name] as any });
  }
  return { registry: createMcpContractRegistry(entries, data.tools), limits };
}
