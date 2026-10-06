import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Works both in dist and in the repository's compiled test directory.
export function packageVersion(): string {
  let directory = dirname(fileURLToPath(import.meta.url));
  while (true) {
    const path = join(directory, 'package.json');
    if (existsSync(path)) {
      const value = JSON.parse(readFileSync(path, 'utf8')) as { name?: unknown; version?: unknown };
      if (value.name === '@safe-shape/mcp' && typeof value.version === 'string') return value.version;
    }
    const parent = dirname(directory);
    if (parent === directory) throw new TypeError('MCP package metadata missing.');
    directory = parent;
  }
}
