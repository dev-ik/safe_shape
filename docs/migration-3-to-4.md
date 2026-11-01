# Migrating from 3.x to 4.0

**English** | [Русский](ru/migration-3-to-4.md)

SafeShape 4.0 adds direct OpenAPI comparison and removes Zod and the MCP SDK
from all published packages and development fixtures. Update all installed
SafeShape packages together to 4.0.0. Node >=20.10 and ESM remain required.

Existing schema constructors, parsing, diagnostics, compatibility, snapshots,
HTTP helpers and CLI commands retain their public behavior and formats.

## MCP server return type

`createSafeShapeMcpServer()` now returns `SafeShapeMcpServer`, a package-owned
interface with `connect(transport)`, `close()`, optional `onerror(error)` and
`onclose()` observers. It no longer returns the SDK's `Server`. Code importing
that type or using SDK extension methods such as `setRequestHandler` must change.
Use the SafeShape inspection server for its six built-in tools. Register other
application tools in your application's server using the existing
`defineMcpTool` and `createValidatedMcpHandler` helpers.

Custom transports implement the exported `McpTransport` interface: asynchronous
`start()`, `send(message)` and `close()`, plus optional `onmessage(message)`,
`onerror(error)` and `onclose()` callbacks. Connect once; close is idempotent.
`McpJsonRpcMessage` describes an outbound JSON object; inbound values are unknown
until validated. `McpCallToolResult` describes the text content, optional structured
JSON content, error flag and metadata returned by SafeShape handlers. These types
no longer require external SDK declarations.

The CLI and manifest format remain available without configuration changes.
The server explicitly negotiates MCP 2025-06-18 and advertises only tools.
A client must finish initialize/initialized before requesting tools. See the
[MCP guide](mcp.md) for supported methods, limits and cancellation behavior.
Clients may use their own protocol libraries; SafeShape does not install one.

## OpenAPI documents

Use `compareOpenApi(previous, next)` from `@safe-shape/api` or `safe-shape` for
OpenAPI 3.0/3.1 YAML, JSON strings or parsed documents. It compares operations,
requests and responses through SafeShape's compatibility engine. Existing
`compareApiSnapshots` still compares SafeShape API snapshots. Neither API accepts
the other's snapshot/document format. See [direct comparison](openapi-comparison.md).

## Development tooling

`npm run dependencies:check` rejects Zod and the MCP SDK in resolved dependency
trees. Installed-consumer checks apply the same rule to release archives.
Quality measurements compare the candidate with the SafeShape 3.1.0 baseline;
competitor benchmark execution has been removed. Historical reports preserve
previous results. The migration utility still reads Zod source text, but neither
it nor its tests import or execute that library.
