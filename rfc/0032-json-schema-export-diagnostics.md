# RFC 0032: machine-readable JSON Schema export diagnostics

## Status

Accepted for the final standards-and-artifacts M4 slice.

## Motivation

JSON Schema cannot represent arbitrary SafeShape refinements or opaque
transform output. Opaque output already throws, but the error is text-only;
refinements are currently omitted silently. Tooling and CI need stable codes,
artifact paths, side and target information, and must never receive an
approximated artifact as if it were complete.

## Proposal

`@safe-shape/json-schema` exports:

- `safeToJsonSchema(schema, options?)`, returning a discriminated
  `JsonSchemaExportResult`;
- immutable `JsonSchemaExportIssue` values with `code`, `severity`, `message`,
  `path`, `side`, and `target`;
- `JsonSchemaExportError`, used by the existing `toJsonSchema()` throwing API.

A successful result contains the immutable schema and immutable warnings list.
A failed result contains one or more immutable issues and no schema. The first
release defines error severity and leaves the warnings list empty while keeping
the result shape ready for non-lossy advisory diagnostics.

Unrepresentable refinements use
`json_schema.refinement.unrepresentable`. Opaque transform output uses
`json_schema.output.opaque`. Invalid artifact ids, conflicting dialect
declarations, and invalid Contract IR use their own stable codes.

Paths locate the affected node in the would-be artifact: object properties use
`properties`, collection and composition nodes use their JSON Schema keywords,
and reusable definitions use `$defs` or `definitions` according to the target.
Traversal collects every detectable unrepresentable node before returning
failure.

`toJsonSchema()` delegates to the safe result and throws one
`JsonSchemaExportError` containing all issues. Standard JSON Schema V1 retains
its required throwing converter contract but throws the same structured error.
CLI JSON errors use code `json_schema_export_failed` and include the issues.

## Compatibility

Representable schemas retain their existing artifacts. The new safe API and
types are additive. Exporting a refined schema now fails instead of silently
emitting a weaker schema; this intentional v2 behavior prevents false contract
claims and is documented here before release.

## Non-Goals

- Translating arbitrary JavaScript predicates into JSON Schema.
- Returning partial schemas after an error.
- Treating lossy export as success behind an option.
- Defining advisory warnings that have no current concrete use case.
