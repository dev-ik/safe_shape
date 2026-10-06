# Package Architecture

**English** | [Русский](ru/package-architecture.md)

Packages:

- `safe-shape`: umbrella package that re-exports public APIs from runtime and tooling packages.
- `@safe-shape/core`: runtime schemas, parsing, results, errors, diagnostics.
- `@safe-shape/compat`: deterministic snapshots and compatibility analysis built on core descriptions.
- `@safe-shape/http`: framework-neutral HTTP boundary helpers built on core schemas.
- `@safe-shape/json-schema`: JSON Schema export built on core schema descriptions.
- `@safe-shape/typescript`: TypeScript declaration generation built on core schema descriptions.
- `@safe-shape/validation`: JSON-friendly validation reports built on core schemas.
- `@safe-shape/api`: endpoint catalogs and fetch clients, OpenAPI and API compatibility; depends on core/http/json-schema/compat. Its browser `./client` entry excludes Node tooling.
- `@safe-shape/mcp`: independently available stdio server and validated application tools, built on core/validation/json-schema/compat and the official MCP SDK.
- `@safe-shape/cli`: command-line tooling built on api, compat, core, json-schema, typescript, and validation.

Dependency direction:

- `mcp -> core/validation/json-schema/compat` and official MCP SDK
- `safe-shape -> mcp` for installation; only `safe-shape/mcp` loads its API/SDK.
- `core` has no MCP/SDK dependency; the umbrella root import graph is unchanged.

- `safe-shape -> api`
- `api -> core/http/json-schema/compat`
- `cli -> api`
- `safe-shape -> core`
- `safe-shape -> compat`
- `safe-shape -> http`
- `safe-shape -> json-schema`
- `safe-shape -> typescript`
- `safe-shape -> validation`
- `safe-shape -> cli`
- `http -> core`
- `compat -> core`
- `json-schema -> core`
- `typescript -> core`
- `validation -> core`
- `cli -> core`
- `cli -> compat`
- `cli -> json-schema`
- `cli -> typescript`
- `cli -> validation`
- `core` has no package dependency on `http`
- `core` has no package dependency on `compat`
- `core` has no package dependency on `json-schema`
- `core` has no package dependency on `typescript`
- `core` has no package dependency on `validation`
