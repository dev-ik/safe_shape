# Package Architecture

Packages:

- `safe-shape`: umbrella package that re-exports public APIs from runtime and tooling packages.
- `@safe-shape/core`: runtime schemas, parsing, results, errors, diagnostics.
- `@safe-shape/http`: framework-neutral HTTP boundary helpers built on core schemas.
- `@safe-shape/json-schema`: JSON Schema export built on core schema descriptions.
- `@safe-shape/typescript`: TypeScript declaration generation built on core schema descriptions.
- `@safe-shape/validation`: JSON-friendly validation reports built on core schemas.
- `@safe-shape/cli`: command-line tooling built on core, json-schema, typescript, and validation.

Dependency direction:

- `safe-shape -> core`
- `safe-shape -> http`
- `safe-shape -> json-schema`
- `safe-shape -> typescript`
- `safe-shape -> validation`
- `safe-shape -> cli`
- `http -> core`
- `json-schema -> core`
- `typescript -> core`
- `validation -> core`
- `cli -> core`
- `cli -> json-schema`
- `cli -> typescript`
- `cli -> validation`
- `core` has no package dependency on `http`
- `core` has no package dependency on `json-schema`
- `core` has no package dependency on `typescript`
- `core` has no package dependency on `validation`
