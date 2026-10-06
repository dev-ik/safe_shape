import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { validateSchemaAsync } from '@safe-shape/validation';
import type { McpTool } from './tool.js';
import { copyJson, jsonBytes, McpOperationError, publicError } from './json.js';
import { checkSignal, ExecutionGate, resolveLimits, type McpLimits } from './limits.js';
export interface McpHandlerContext { readonly signal?: AbortSignal }
export function createValidatedMcpHandler<I, RawI, O, RawO>(
  tool: McpTool<I, RawI, O, RawO>, handler: (value: NoInfer<I>, context: { readonly signal: AbortSignal }) => NoInfer<RawO> | Promise<NoInfer<RawO>>,
  limits?: Partial<McpLimits>,
): (argumentsValue: unknown, context?: McpHandlerContext) => Promise<CallToolResult> {
  const gate = new ExecutionGate(resolveLimits(limits));
  return async (argumentsValue, context = {}) => {
    try {
      return await gate.run(async signal => {
        copyJson(argumentsValue, gate.limits.depth, false);
        const input = argumentsValue;
        if (jsonBytes(input) > gate.limits.requestBytes) throw new McpOperationError('request_too_large', 'Input size limit exceeded.');
        const parsed = await validateSchemaAsync(tool.input, input); checkSignal(signal);
        if (!parsed.valid) throw new McpOperationError('argument_validation_failed', 'Tool arguments failed validation.', parsed.issues);
        const value = await handler(parsed.data, { signal }); checkSignal(signal);
        // Inspect raw results before parsing so getters cannot be invoked by a schema.
        copyJson(value, gate.limits.depth, false);
        const raw = value;
        const output = await validateSchemaAsync(tool.output, raw); checkSignal(signal);
        if (!output.valid) throw new McpOperationError('result_validation_failed', 'Tool result failed validation.', output.issues);
        copyJson(output.data, gate.limits.depth, false);
        const data = output.data as Record<string, unknown>;
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new McpOperationError('result_object_required', 'MCP structured results must be objects.');
        const result: CallToolResult = Object.freeze({ content: Object.freeze([Object.freeze({ type: 'text' as const, text: JSON.stringify(data) })]) as unknown as CallToolResult['content'], structuredContent: data, ...((parsed.warnings?.length || output.warnings?.length) ? { _meta: copyJson({ 'safe-shape/warnings': { input: parsed.warnings ?? [], output: output.warnings ?? [] } }, gate.limits.depth + 6) } : {}) });
        if (jsonBytes(result) > gate.limits.responseBytes) throw new McpOperationError('response_too_large', 'Result size limit exceeded.');
        return result;
      }, context.signal);
    } catch (error) {
      let safe: unknown;
      try { safe = copyJson(publicError(error), gate.limits.depth + 6); } catch { safe = { code: 'serialization_failed', message: 'Diagnostics are not lossless JSON.' }; }
      const result: CallToolResult = copyJson({ content: [{ type: 'text', text: JSON.stringify(safe) }], isError: true }, gate.limits.depth + 6);
      if (jsonBytes(result) > gate.limits.responseBytes) throw new McpOperationError('response_too_large', 'Error cannot fit response limit.');
      return result;
    }
  };
}
