# RFC 0051: AI contracts and MCP

## Status

Accepted

The user approved the AI/MCP specification and parent-executed implementation
plan. Deliver both workflows together, without authorizing publication.

## Public capability

Add `@safe-shape/mcp` (also exposed through `safe-shape/mcp` under RFC 0052): `createMcpContractRegistry`,
`createSafeShapeMcpServer`, `defineMcpTool`, `safeToMcpToolDefinition` and
`createValidatedMcpHandler`, their types, and the `safe-shape-mcp` executable.
Six fixed inspection tools discover, describe, export, validate and compare
registered contracts and export registered application-tool definitions.

Input schemas validate arguments before business execution; output schemas
validate results before success. Preserve transformed type inference, async
rules, warnings and native recursive diagnostics. Exact MCP export never
weakens opaque constraints. Object-root JSON wire schemas are the baseline.
Operational errors differ from completed invalidity/compatibility reports.

Use an operator manifest with IDs, trusted local ESM schema exports and tool
catalog. Agents cannot select paths, execute handlers or update baselines.
Bound frames, result sizes and concurrency. Deadlines/cancellation are
cooperative, do not terminate trusted JavaScript and do not undo side effects.

Existing APIs, CLI envelopes and snapshots remain compatible. The complete
[specification](../docs/superpowers/specs/2026-10-06-ai-mcp-release-design.md)
defines acceptance, limits and release qualification.
