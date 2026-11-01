import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const forbidden = new Set(['zod', 'zod-to-json-schema', '@modelcontextprotocol/sdk']);

/** Check resolved packages, including nested installs; optional peer declarations are not installs. */
export async function assertIndependentDependencies(directory) {
  const lock = JSON.parse(await readFile(resolve(directory, 'package-lock.json'), 'utf8'));
  for (const [path, entry] of Object.entries(lock.packages ?? {})) {
    const name = entry.name ?? path.split('node_modules/').at(-1);
    assert.ok(!forbidden.has(name), `Forbidden runtime dependency ${name} in ${directory}: ${path}`);
    for (const field of ['dependencies', 'devDependencies', 'optionalDependencies']) {
      for (const dependency of Object.keys(entry[field] ?? {})) {
        assert.ok(!forbidden.has(dependency), `Forbidden ${field} entry ${dependency} in ${directory}: ${path}`);
      }
    }
  }
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  for (const directory of process.argv.slice(2).length ? process.argv.slice(2) : ['.', 'quality']) {
    await assertIndependentDependencies(directory);
  }
  console.log('dependency-check: no Zod or MCP SDK in resolved dependency trees');
}
