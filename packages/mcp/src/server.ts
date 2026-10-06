import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema, McpError, ErrorCode, type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { packageVersion } from './version.js';
import { validateSchemaAsync } from '@safe-shape/validation';
import { copyJson, jsonBytes, McpOperationError, publicError } from './json.js';
import { ExecutionGate, resolveLimits, checkSignal, type McpLimits } from './limits.js';
import { inspectionSchemas, inspectionDefinitions, createInspection } from './inspection.js';
import type { McpContractRegistry } from './types.js';
const version = packageVersion();
export function createSafeShapeMcpServer(options: { readonly registry: McpContractRegistry; readonly limits?: Partial<McpLimits> }): Server {
  const gate = new ExecutionGate(resolveLimits(options.limits));
  const execute = createInspection(options.registry);
  const server = new Server({ name: 'safe-shape', version }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...inspectionDefinitions()] }));
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const name = request.params.name;
    if (!Object.hasOwn(inspectionSchemas, name)) throw new McpError(ErrorCode.InvalidParams, 'Unknown inspection tool.');
    const operation = name as keyof typeof inspectionSchemas;
    let payload: unknown;
    let isError = false;
    try {
      payload = await gate.run(async signal => {
        const args = copyJson(request.params.arguments ?? {}, gate.limits.depth);
        if (jsonBytes(args) > gate.limits.requestBytes) throw new McpOperationError('request_too_large', 'Input size limit exceeded.');
        const parsed = await validateSchemaAsync(inspectionSchemas[operation], args); checkSignal(signal);
        if (!parsed.valid) throw new McpError(ErrorCode.InvalidParams, 'Invalid inspection arguments.');
        const result = await execute(operation, parsed.data); checkSignal(signal);
        copyJson(result, gate.limits.depth + 6, false);
        return Object.freeze({ ok: true, operation, result });
      }, extra.signal);
    } catch (error) {
      if (error instanceof McpError) throw error;
      isError = true;
      try { payload = copyJson({ ok: false, operation, error: publicError(error) }, gate.limits.depth + 6); }
      catch { payload = { ok: false, operation, error: { code: 'serialization_failed', message: 'Diagnostics are not lossless JSON.' } }; }
    }
    const materialize = (value: any, failed: boolean): CallToolResult => {
      copyJson(value, gate.limits.depth + 6, false);
      return Object.freeze({ content: Object.freeze([Object.freeze({ type: 'text' as const, text: JSON.stringify(value) })]) as unknown as CallToolResult['content'], structuredContent: value, ...(failed ? { isError: true } : {}) });
    };
    let result: CallToolResult;
    try { result = materialize(payload, isError); }
    catch { result = materialize({ ok: false, operation, error: { code: 'serialization_failed', message: 'Result cannot be materialized.' } }, true); }
    if (jsonBytes(result) > gate.limits.responseBytes) result = materialize({ ok: false, operation, error: { code: 'response_too_large', message: 'Result size limit exceeded.' } }, true);
    if (jsonBytes(result) > gate.limits.responseBytes) { await server.close(); throw new McpError(ErrorCode.InternalError, 'Response limit too small.'); }
    return result;
  });
  return server;
}
