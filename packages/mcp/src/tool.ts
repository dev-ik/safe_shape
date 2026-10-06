import type { Schema } from '@safe-shape/core';
import { safeToJsonSchema, type JsonSchema, type JsonSchemaExportIssue } from '@safe-shape/json-schema';
import { copyJson } from './json.js';
import { requireDescription, requireId } from './registry.js';
export interface McpTool<I, RawI, O, RawO> { readonly name: string; readonly description: string; readonly input: Schema<I, RawI>; readonly output: Schema<O, RawO> }
export interface McpToolDefinition { readonly name: string; readonly description: string; readonly inputSchema: JsonSchema; readonly outputSchema: JsonSchema }
export interface McpProfileIssue { readonly code: 'mcp.profile.object_required' | 'mcp.profile.serialization_failed'; readonly message: string; readonly path: readonly (string | number)[]; readonly side: 'input' | 'output' }
export type McpToolExportResult = Readonly<{ success: true; definition: McpToolDefinition; warnings: readonly JsonSchemaExportIssue[] }> | Readonly<{ success: false; issues: readonly (JsonSchemaExportIssue | McpProfileIssue)[] }>;
export function defineMcpTool<I, RawI, O, RawO>(tool: McpTool<I, RawI, O, RawO>): McpTool<I, RawI, O, RawO> {
  requireId(tool.name); requireDescription(tool.description);
  if (!/^[A-Za-z0-9_.-]+$/.test(tool.name)) throw new TypeError('Invalid MCP tool name.');
  if (!tool.input || !tool.output || typeof tool.input.safeParseAsync !== 'function' || typeof tool.output.safeParseAsync !== 'function') throw new TypeError('SafeShape input/output schemas required.');
  return Object.freeze({ name: tool.name, description: tool.description, input: tool.input, output: tool.output });
}
function objectRoot(schema: JsonSchema): boolean {
  let node: any = schema;
  const seen = new Set<unknown>();
  while (node && typeof node === 'object' && !seen.has(node)) {
    if (node.type === 'object') return true;
    seen.add(node);
    if (typeof node.$ref !== 'string' || !node.$ref.startsWith('#/')) return false;
    node = node.$ref.slice(2).split('/').map((s: string) => s.replaceAll('~1', '/').replaceAll('~0', '~')).reduce((value: any, key: string) => value && Object.hasOwn(value, key) ? value[key] : undefined, schema);
  }
  return false;
}
function exportDefinition(tool: McpTool<any, any, any, any>): McpToolExportResult {
  const input = safeToJsonSchema(tool.input, { side: 'input', target: 'draft-2020-12', mode: 'exact' });
  const output = safeToJsonSchema(tool.output, { side: 'output', target: 'draft-2020-12', mode: 'exact' });
  const issues: (JsonSchemaExportIssue | McpProfileIssue)[] = [];
  for (const [side, result] of [['input', input], ['output', output]] as const) {
    if (!result.success) issues.push(...result.issues);
    else if (!objectRoot(result.schema)) issues.push({ code: 'mcp.profile.object_required', message: 'MCP wire schemas must have object roots.', side, path: [] });
  }
  if (issues.length) return copyJson({ success: false, issues });
  if (!input.success || !output.success) throw new Error('Unreachable export result.');
  return copyJson({ success: true, definition: { name: tool.name, description: tool.description, inputSchema: { ...input.schema, type: 'object' }, outputSchema: { ...output.schema, type: 'object' } }, warnings: [...input.warnings, ...output.warnings] });
}

export function safeToMcpToolDefinition(tool: McpTool<any, any, any, any>): McpToolExportResult {
  try { return exportDefinition(tool); }
  catch { return copyJson({ success: false, issues: [{ code: 'mcp.profile.serialization_failed', message: 'Tool definition cannot be materialized as bounded lossless JSON.', path: [], side: 'input' }] }); }
}
