import { createProtocolServer, McpProtocolError, type McpCallToolResult, type SafeShapeMcpServer } from './protocol.js';
import { packageVersion } from './version.js';
import { validateSchemaAsync } from '@safe-shape/validation';
import { copyJson, jsonBytes, McpOperationError, publicError } from './json.js';
import { ExecutionGate, resolveLimits, checkSignal, type McpLimits } from './limits.js';
import { inspectionSchemas, inspectionDefinitions, createInspection } from './inspection.js';
import type { McpContractRegistry } from './types.js';
const version = packageVersion();
export function createSafeShapeMcpServer(options: { readonly registry: McpContractRegistry; readonly limits?: Partial<McpLimits> }): SafeShapeMcpServer {
  const gate = new ExecutionGate(resolveLimits(options.limits));
  const execute = createInspection(options.registry);
  const server = createProtocolServer({ version, limits: gate.limits, list: inspectionDefinitions, call: async (name, argumentsValue, externalSignal) => {
    if (!Object.hasOwn(inspectionSchemas, name)) throw new McpProtocolError(-32602, 'Unknown inspection tool.');
    const operation = name as keyof typeof inspectionSchemas;
    let payload: unknown;
    let isError = false;
    try {
      payload = await gate.run(async signal => {
        const args = copyJson(argumentsValue, gate.limits.depth);
        if (jsonBytes(args) > gate.limits.requestBytes) throw new McpOperationError('request_too_large', 'Input size limit exceeded.');
        const parsed = await validateSchemaAsync(inspectionSchemas[operation], args); checkSignal(signal);
        if (!parsed.valid) throw new McpProtocolError(-32602, 'Invalid inspection arguments.');
        const result = await execute(operation, parsed.data); checkSignal(signal);
        copyJson(result, gate.limits.depth + 6, false);
        return Object.freeze({ ok: true, operation, result });
      }, externalSignal);
    } catch (error) {
      if (error instanceof McpProtocolError) throw error;
      isError = true;
      try { payload = copyJson({ ok: false, operation, error: publicError(error) }, gate.limits.depth + 6); }
      catch { payload = { ok: false, operation, error: { code: 'serialization_failed', message: 'Diagnostics are not lossless JSON.' } }; }
    }
    const materialize = (value: any, failed: boolean): McpCallToolResult => {
      copyJson(value, gate.limits.depth + 6, false);
      return Object.freeze({ content: Object.freeze([Object.freeze({ type: 'text' as const, text: JSON.stringify(value) })]), structuredContent: value, ...(failed ? { isError: true } : {}) });
    };
    let result: McpCallToolResult;
    try { result = materialize(payload, isError); }
    catch { result = materialize({ ok: false, operation, error: { code: 'serialization_failed', message: 'Result cannot be materialized.' } }, true); }
    if (jsonBytes(result) > gate.limits.responseBytes) result = materialize({ ok: false, operation, error: { code: 'response_too_large', message: 'Result size limit exceeded.' } }, true);
    if (jsonBytes(result) > gate.limits.responseBytes) { await server.close(); throw new McpProtocolError(-32603, 'Response limit too small.'); }
    return result;
  } });
  return server;
}
