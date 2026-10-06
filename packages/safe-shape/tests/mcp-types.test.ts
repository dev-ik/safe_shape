import { object, string } from 'safe-shape';
import { defineMcpTool, createValidatedMcpHandler, type McpLimits } from 'safe-shape/mcp';
const tool = defineMcpTool({ name: 'typed', description: 'Typed subpath', input: object({ value: string().transform(v => v.length) }), output: string().transform(v => ({ length: v.length })) });
createValidatedMcpHandler(tool, ({ value }) => { const n: number = value; return String(n); });
// @ts-expect-error Handler receives parsed input, not the original string.
createValidatedMcpHandler(tool, (value: { value: string }) => value.value);
// @ts-expect-error Handler must return accepted input of its output contract.
createValidatedMcpHandler(tool, () => ({ length: 1 }));
const limits: Partial<McpLimits> = { concurrency: 1 };
createValidatedMcpHandler(tool, value => String(value.value), limits);
