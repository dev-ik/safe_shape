import { randomUUID } from 'node:crypto';
import { object, string, integer, unknown as unknownSchema, enum as enumSchema, boolean, array, union, literal, describeContract } from '@safe-shape/core';
import { toJsonSchema, safeToJsonSchema } from '@safe-shape/json-schema';
import { validateSchemaAsync } from '@safe-shape/validation';
import { compareContractsV2, createMigrationDiagnostics } from '@safe-shape/compat';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import type { McpContractRegistry } from './types.js';
import { McpOperationError } from './json.js';
import { defineMcpTool, safeToMcpToolDefinition } from './tool.js';
import type { Schema } from '@safe-shape/core';
export type InspectionName = 'list_contracts' | 'describe_contract' | 'export_json_schema' | 'validate_data' | 'compare_contracts' | 'export_tool_definition';
const id = string({ minLength: 1, maxLength: 128 });
const side = enumSchema(['input', 'output'] as const).optional();
export const inspectionSchemas: Readonly<Record<InspectionName, Schema<any, any>>> = Object.freeze({
  list_contracts: object({ cursor: string({ maxLength: 256 }).optional(), limit: integer({ minimum: 1, maximum: 100 }).optional() }),
  describe_contract: object({ contractId: id }),
  export_json_schema: object({ contractId: id, side, target: enumSchema(['draft-2020-12', 'draft-07'] as const).optional() }),
  validate_data: object({ contractId: id, value: unknownSchema() }),
  compare_contracts: object({ previousId: id, nextId: id, mode: enumSchema(['backward', 'forward', 'full'] as const).optional(), side }),
  export_tool_definition: object({ toolId: id }),
});
const messages: Record<keyof typeof inspectionSchemas, string> = {
  list_contracts: 'Discover registered SafeShape contract IDs before inspecting or validating them.',
  describe_contract: 'Inspect the input/output contract graphs and supported operations for a registered contract.',
  export_json_schema: 'Export an exact JSON Schema for a registered contract; unsupported constraints produce diagnostics.',
  validate_data: 'Validate inline JSON against a registered contract and return parsed data or native issues for correction.',
  compare_contracts: 'Check directional compatibility between registered contract versions without changing baselines.',
  export_tool_definition: 'Export MCP input/output schemas for a tool in the developer-configured catalog.',
};
const envelope = union([
  object({ ok: literal(true), operation: string(), result: unknownSchema() }),
  object({ ok: literal(false), operation: string(), error: object({ code: string(), message: string(), issues: unknownSchema().optional() }) }),
]);
export function inspectionDefinitions(): readonly Tool[] {
  const schema = toJsonSchema(envelope);
  return Object.freeze((Object.keys(inspectionSchemas) as (keyof typeof inspectionSchemas)[]).sort().map(name => ({
    name, description: messages[name], inputSchema: toJsonSchema(inspectionSchemas[name]) as Tool['inputSchema'],
    outputSchema: { ...schema, type: 'object' } as NonNullable<Tool['outputSchema']>,
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  })));
}
export function createInspection(registry: McpContractRegistry) {
  const nonce = randomUUID();
  const get = (contractId: string) => {
    const entry = registry.getContract(contractId);
    if (!entry) throw new McpOperationError('unknown_contract_id', 'Contract ID is not registered.');
    return entry;
  };
  return async (name: keyof typeof inspectionSchemas, args: any): Promise<unknown> => {
    switch (name) {
      case 'list_contracts': {
        let start = 0;
        if (args.cursor !== undefined) {
          const decoded = Buffer.from(args.cursor, 'base64url').toString('utf8');
          const prefix = `${nonce}:`;
          const offset = decoded.slice(prefix.length);
          if (!decoded.startsWith(prefix) || !/^[1-9][0-9]*$/.test(offset) || Buffer.from(decoded).toString('base64url') !== args.cursor) throw new McpOperationError('invalid_cursor', 'Cursor is invalid or stale.');
          start = Number(offset);
          if (!Number.isSafeInteger(start) || start >= registry.contracts.length) throw new McpOperationError('invalid_cursor', 'Cursor is invalid or stale.');
        }
        const end = start + (args.limit ?? 20);
        return { contracts: registry.contracts.slice(start, end).map(({ id, description }) => ({ id, description })), ...(end < registry.contracts.length ? { nextCursor: Buffer.from(`${nonce}:${end}`).toString('base64url') } : {}) };
      }
      case 'describe_contract': {
        const entry = get(args.contractId);
        return { id: entry.id, description: entry.description, contract: describeContract(entry.schema), operations: { validate: true, exportInput: safeToJsonSchema(entry.schema, { side: 'input' }).success, exportOutput: safeToJsonSchema(entry.schema, { side: 'output' }).success, compare: true } };
      }
      case 'export_json_schema': {
        const result = safeToJsonSchema(get(args.contractId).schema, { side: args.side ?? 'input', target: args.target ?? 'draft-2020-12', mode: 'exact' });
        if (!result.success) throw new McpOperationError('json_schema_export_failed', 'Contract cannot be exported exactly.', result.issues);
        return { schema: result.schema, warnings: result.warnings };
      }
      case 'validate_data': return validateSchemaAsync(get(args.contractId).schema, args.value);
      case 'compare_contracts': {
        const report = compareContractsV2(get(args.previousId).schema, get(args.nextId).schema, { compatibility: args.mode ?? 'backward', side: args.side ?? 'input' });
        return { report, migration: createMigrationDiagnostics(report) };
      }
      case 'export_tool_definition': {
        const entry = registry.getTool(args.toolId);
        if (!entry) throw new McpOperationError('unknown_tool_id', 'Tool ID is not registered.');
        const result = safeToMcpToolDefinition(defineMcpTool({ name: entry.name, description: entry.description, input: get(entry.inputId).schema, output: get(entry.outputId).schema }));
        if (!result.success) throw new McpOperationError('tool_definition_export_failed', 'Tool definition cannot be exported exactly.', result.issues);
        return { definition: result.definition, warnings: result.warnings };
      }
    }
  };
}
