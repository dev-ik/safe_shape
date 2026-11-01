# SafeShape 4.0.0: direct OpenAPI comparison and independent MCP

**English** | [Русский](ru/release-4.0.0.md)

Prepared release; not yet published. All ten packages share version 4.0.0.
Node >=20.10 and ESM remain required.

`compareOpenApi(previous, next)` accepts OpenAPI YAML, JSON strings or parsed
documents through `@safe-shape/api` and `safe-shape`. Operations, requests and
responses are compared using SafeShape's existing compatibility engine. No
manually maintained SafeShape schema copy is required. Supported features include
local recursive references, field constraints, requiredness, parameter inheritance,
JSON media types, response headers and explicit/range/default statuses.
Unsupported features produce source-addressed manual-review issues. Formats require
an explicit policy. See the [guide](openapi-comparison.md),
[API reference](api/api.md#direct-openapi-comparison-400) and
[YAML example](../examples/openapi-comparison.mjs).

Zod, zod-to-json-schema and the official MCP SDK are removed from production and
development dependencies. The MCP server now uses SafeShape validation and its
own bounded JSON-RPC/stdio implementation, with MCP 2025-06-18 initialization,
tools, cancellation, limits and shutdown handling. SDK clients are no longer used
by tests or examples. Quality fixtures compare the current candidate with an older
SafeShape baseline; migration fixtures execute only the converted SafeShape code.
Dependency gates also check installed release archives.

This is a major release because `createSafeShapeMcpServer` returns the narrow
`SafeShapeMcpServer` interface instead of SDK `Server`. The MCP CLI and manifest,
schema APIs and snapshot formats remain stable. See [migration from 3.x](migration-3-to-4.md)
for custom transport types and SDK-specific API changes.

The API tooling package adds yaml 2.9.1; the browser client entry remains separate.
EN/RU guides, API references, package READMEs and navigation describe the new release.
Historical release evidence retains its original versions and measurements.
Publication follows the [release gate](release.md); local test evidence does not
replace remote CI or a real-agent walkthrough of the new MCP implementation.

Local gate results: [4.0.0 evidence](release-evidence-4.0.0.md).
