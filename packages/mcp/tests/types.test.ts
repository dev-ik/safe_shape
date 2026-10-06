import { object, string, number } from '@safe-shape/core';
import { defineMcpTool, createValidatedMcpHandler } from '../src/index.js';
const tool = defineMcpTool({ name: 'typed', description: 'Typed', input: object({ length: string().transform(v => v.length) }), output: string().transform(v => ({ length: v.length })) });
createValidatedMcpHandler(tool, value => { const length: number = value.length; return String(length); });
// @ts-expect-error Handler receives transformed input, not the raw string.
createValidatedMcpHandler(tool, (value: { length: string }) => value.length);
// @ts-expect-error Handler returns output schema accepted input, not its parsed object.
createValidatedMcpHandler(tool, () => ({ length: 1 }));
createValidatedMcpHandler(defineMcpTool({ name: 'number', description: 'Number', input: object({}), output: number() }), () => 1);
