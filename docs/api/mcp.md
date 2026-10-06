# @safe-shape/mcp API

**English** | [Русский](../ru/api/mcp.md)

Node ESM APIs are available through `safe-shape/mcp` after `npm install safe-shape`.
They can also be imported from the independently installed `@safe-shape/mcp`.
The main `safe-shape` import does not load MCP/SDK; the installation includes
them transitively.

- `createMcpContractRegistry(entries, tools?)`: copy/freeze contract entries
  `{id, description, schema}` and catalog entries
  `{id, name, description, inputId, outputId}`. IDs are non-empty strings up to
  128 characters. Duplicate IDs/names and missing references throw TypeError.
  Read via `contracts`, `tools`, `getContract(id)` and `getTool(id)`.
- `createSafeShapeMcpServer({registry, limits?})`: official SDK Server with the six
  inspection tools; call `connect(transport)` and `close()` explicitly.
- `defineMcpTool({name, description, input, output})`: immutable typed metadata.
- `safeToMcpToolDefinition(tool)`: frozen `{success:true, definition, warnings}`
  or `{success:false, issues}`. Exact input/output graph export with object roots.
- `createValidatedMcpHandler(tool, handler, limits?)`: async callback accepting
  `(arguments, {signal}?)`. Business handler receives parsed input and `{signal}`;
  returns output-schema accepted input. Successful wire data is parsed output.
  Execution errors use `isError:true`; there is no automatic retry.
- `DEFAULT_MCP_LIMITS` and `McpLimits`: requestBytes/depth/responseBytes/
  concurrency/deadlineMs defaults and configurable positive safe integers.

Types: `McpContractEntry`, `McpToolCatalogEntry`, `McpContractRegistry`,
`McpTool`, `McpToolDefinition`, `McpToolExportResult`, `McpProfileIssue`,
`McpHandlerContext`, `McpLimits`. Public wrappers are immutable; payload
immutability retains existing core behavior. See [usage and trust boundaries](../mcp.md).
