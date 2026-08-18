# CLI

`@safe-shape/cli` provides the `safe-shape` binary.

Installing the umbrella `safe-shape` package also exposes the same binary.

## Commands

```sh
safe-shape --json doctor
safe-shape schema export --module ./schema.mjs --export userSchema
safe-shape schema validate --module ./schema.mjs --export userSchema --input ./user.json
safe-shape schema types --module ./schema.mjs --export userSchema --name User
safe-shape contract snapshot --module ./schema.mjs --export userSchema --id user --out ./user.contract.json
safe-shape contract snapshot --module ./tree.mjs --export treeSchema --id tree --format v2 --out ./tree.contract.json
safe-shape --json contract check --module ./tree.mjs --export treeSchema --against ./tree.contract.json --side input
```

## Doctor

`doctor` checks local runtime availability.

```sh
safe-shape --json doctor
```

The command does not require auth.

## Schema Export

`schema export` loads a JavaScript ESM module by file path and named export, then exports
the SafeShape schema as JSON Schema.

```sh
safe-shape schema export \
  --module ./schema.mjs \
  --export userSchema \
  --schema https://json-schema.org/draft/2020-12/schema \
  --id https://example.com/contracts/user \
  --out ./user.schema.json
```

`--export` defaults to `default`.

Metadata annotations from `schema.annotate(...)` are preserved in JSON Schema
output as `title`, `description`, and `examples`.

Recursive `lazy()` schemas are exported through deterministic `$defs` and
`$ref` entries.

`--schema` recognizes the official Draft 2020-12 and Draft 7 URIs. Draft 7
uses `definitions`, `#/definitions/...`, and its `items` tuple syntax; Draft
2020-12 uses `$defs`, `#/$defs/...`, and `prefixItems`. Other URIs are emitted
verbatim with the default Draft 2020-12 renderer.

`--id` adds a root JSON Schema `$id` for `schema export`. It must be an absolute
URI without a fragment. Under `contract snapshot`, the same contextual flag
continues to identify the SafeShape contract rather than a JSON Schema document.

`enum()`, `unknown()`, and `never()` export as JSON Schema `enum`, `{}`, and
`{ "not": {} }` respectively.

`discriminatedUnion()` and `intersection()` export as `oneOf` and `allOf`.
Validation preserves selected-branch diagnostics and intersection issue codes.
Failed ordinary unions emit their ordered recursive `branches` tree in JSON
validation reports, with complete issue paths for every choice.
Relative `refine()` paths and ordered issues emitted by `refineWithIssues()`
also pass through JSON validation reports unchanged.

String patterns and `email`, `uuid`, `date`, and `date-time` formats retain
their exact runtime validation behavior and export as JSON Schema constraints.
Numeric `multipleOf` exports directly, and record key constraints export as
JSON Schema `propertyNames`; validation retains their native issue codes.
Object `reject`, `strip`, and `passthrough` policies retain their runtime
outputs. Export is input-side by default, so `strip` and `passthrough` allow
additional properties in generated JSON Schema.

If export encounters a refinement or other behavior JSON Schema cannot
represent, it does not write a partial artifact. Under `--json`, stderr contains
`error.code: "json_schema_export_failed"` and `error.issues` with stable
exporter codes, artifact paths, side, and target. The command exits with `1`.

## Schema Validate

`schema validate` loads a JavaScript ESM module by file path and named export,
reads a JSON input file, and validates it through the SafeShape schema.

```sh
safe-shape --json schema validate \
  --module ./schema.mjs \
  --export userSchema \
  --input ./user.json
```

Use `--input -` to read JSON from stdin:

```sh
cat ./user.json | safe-shape --json schema validate \
  --module ./schema.mjs \
  --export userSchema \
  --input -
```

Use `--out` to write the full validation report to a file:

```sh
safe-shape --json schema validate \
  --module ./schema.mjs \
  --export userSchema \
  --input ./user.json \
  --out ./validation-report.json
```

Valid input exits with code `0` and returns `valid: true`. Invalid input exits
with code `1` and returns `valid: false` with SafeShape issues.

## Schema Types

`schema types` loads a JavaScript ESM module by file path and named export, then
generates a TypeScript type declaration from the SafeShape schema definition.

```sh
safe-shape schema types \
  --module ./schema.mjs \
  --export userSchema \
  --name User \
  --out ./user.d.ts
```

`--export` defaults to `default`. `--name` defaults to `SchemaOutput`.

The generated type is based on runtime schema introspection. `transform()` output
types are emitted as `unknown` because mapper return types are not available at
runtime.

Recursive type generation is not available yet; `schema types` reports a CLI
error instead of emitting an incomplete declaration.

## Contract Snapshot

`contract snapshot` writes a deterministic, JSON-safe contract tree and SHA-256
fingerprint:

```sh
safe-shape contract snapshot \
  --module ./schema.mjs \
  --export userSchema \
  --id user \
  --out ./.safe-shape/user.contract.json
```

`--export` defaults to `default`. `--id` defaults to the export name. When
`--out` is omitted, the snapshot is written to stdout.

The CLI writes snapshot v1 by default to preserve existing baselines. Pass
`--format v2` for recursive schemas and independent input/output graph
fingerprints:

```sh
safe-shape contract snapshot \
  --module ./tree.mjs \
  --export treeSchema \
  --id tree \
  --format v2 \
  --out ./.safe-shape/tree.contract.json
```

V1 rejects recursive `lazy()` schemas. V2 stores both graph sides and supports
them without changing v1 format or fingerprint behavior.

## Contract Check

`contract check` compares a runtime schema with a stored snapshot:

```sh
safe-shape --json contract check \
  --module ./schema.mjs \
  --export userSchema \
  --against ./.safe-shape/user.contract.json \
  --compatibility backward
```

Compatibility modes are `backward` (default), `forward`, and `full`.
The command detects v1 or v2 from the stored snapshot. For v2, use
`--side input` (the default) or `--side output`; supplying `--side` for a v1
baseline is an operational error.

The command exits with:

- `0` for `safe` and `annotation-only` reports;
- `2` for `breaking`, `risky`, and `unknown` reports;
- `1` for operational errors such as invalid arguments or a malformed snapshot.

Compatibility failures are command results and are written to stdout under
`--json`. Malformed or fingerprint-mismatched snapshots are CLI errors and are
written to stderr. JSON results include the detected snapshot `format` and an
immutable `migration` object with a `compatible`, `migration-required`, or
`manual-review` decision, status counts, summary, and actionable diagnostics.

## JSON Policy

With `--json`, commands emit a stable JSON envelope.

Success:

```json
{
  "ok": true,
  "command": "schema export"
}
```

Error:

```json
{
  "ok": false,
  "command": "schema export",
  "error": {
    "code": "missing_export",
    "message": "Module does not export \"userSchema\"."
  }
}
```

Validation failure:

```json
{
  "ok": false,
  "command": "schema validate",
  "valid": false,
  "issues": []
}
```

Compatibility failure:

```json
{
  "ok": false,
  "command": "contract check",
  "compatible": false,
  "status": "breaking",
  "findings": [],
  "migration": {
    "decision": "migration-required",
    "migrationRequired": true,
    "manualReviewRequired": false,
    "counts": {
      "safe": 0,
      "breaking": 1,
      "risky": 0,
      "unknown": 0,
      "annotationOnly": 0
    },
    "summary": "Contract migration is required for 1 breaking finding.",
    "diagnostics": []
  }
}
```

The CLI does not require auth and does not print secrets.

See [Contract Checks in CI](../ci.md) for vendor-neutral shell, GitHub Actions,
and GitLab CI examples and baseline review policy.
