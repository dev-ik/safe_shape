# @safe-shape/mcp API

**English** | [Русский](../ru/api/mcp.md)

Node ESM APIs are available through `safe-shape/mcp` after `npm install safe-shape`.
They can also be imported from the independently installed `@safe-shape/mcp`.
The main `safe-shape` import does not load MCP. No Zod or MCP SDK is installed.

- `createMcpContractRegistry(entries, tools?)`: copy/freeze contract entries
  `{id, description, schema}` and catalog entries
  `{id, name, description, inputId, outputId}`. IDs are non-empty strings up to
  128 characters. Duplicate IDs/names and missing references throw TypeError.
  Read via `contracts`, `tools`, `getContract(id)` and `getTool(id)`.
- `createSafeShapeMcpServer({registry, limits?})`: `SafeShapeMcpServer` with the six
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
`McpHandlerContext`, `McpLimits`, `SafeShapeMcpServer`, `McpTransport`,
`McpJsonRpcMessage`, `McpCallToolResult`. Public wrappers are immutable; payload
immutability retains existing core behavior. See [usage and trust boundaries](../mcp.md).

## Server and transport types (4.0.0)

`SafeShapeMcpServer.connect(transport: McpTransport): Promise<void>` starts one
transport. Reconnecting throws TypeError. `close(): Promise<void>` is idempotent,
clears callbacks, aborts pending calls and suppresses late replies. Optional
`onerror(error: Error)` and `onclose()` observers cannot prevent cleanup.

`McpTransport` has async `start()`, `send(message: McpJsonRpcMessage)`, `close()`
methods and optional `onmessage(message: unknown)`, `onerror(error: Error)`,
`onclose()` callbacks. The transport must report closure/errors and deliver complete
JSON messages. The server validates inputs, byte/depth limits and lifecycle even
for custom transports. Custom network authentication remains the application's job.
The CLI provides bounded UTF-8 newline-delimited stdio with bounded output buffering
and waits for stream write completion. Closing does not destroy shared stdout.

`McpJsonRpcMessage` is `Readonly<Record<string, unknown>>`.
`McpCallToolResult` contains readonly text `content` entries, optional
`structuredContent: Readonly<Record<string, unknown>>`, `isError: boolean` and
`_meta: Readonly<Record<string, unknown>>`. It is the SafeShape handler result,
not the full set of content variants supported by other MCP servers.

Supported wire methods and initialization are documented in the [MCP guide](../mcp.md).
See [migration from 3.x](../migration-3-to-4.md) for the former SDK Server return type.
