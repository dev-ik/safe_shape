#!/usr/bin/env node
import { loadMcpManifest } from './manifest.js';
import { BoundedStdioTransport } from './stdio.js';
import { createSafeShapeMcpServer } from './server.js';
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--help') { process.stderr.write('safe-shape-mcp --workspace <root> --manifest <file>\n'); return; }
  if (args.length !== 4) throw new TypeError('Expected workspace and manifest.');
  const flags = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    if (!['--workspace', '--manifest'].includes(args[i]!) || flags.has(args[i]!)) throw new TypeError('Invalid arguments.');
    flags.set(args[i]!, args[i + 1]!);
  }
  if (!flags.has('--workspace') || !flags.has('--manifest')) throw new TypeError('Missing arguments.');
  const options = await loadMcpManifest(flags.get('--workspace')!, flags.get('--manifest')!);
  const server = createSafeShapeMcpServer(options);
  const transport = new BoundedStdioTransport(process.stdin, options.limits);
  transport.onerror = () => { process.stderr.write('MCP protocol request failed.\n'); };
  let stopping = false;
  const stop = () => { if (stopping) return; stopping = true; void server.close(); process.stdin.destroy(); };
  transport.onclose = stop;
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  await server.connect(transport);
}
void main().catch(() => { process.stderr.write('SafeShape MCP startup failed. Check the manifest and trusted schema modules.\n'); process.exitCode = 1; });
