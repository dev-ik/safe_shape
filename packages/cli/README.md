# @safe-shape/cli

Command-line tooling for SafeShape runtime contracts.

## Install Locally

From the repository root:

```sh
npm install
npm run build
npm run link:cli
```

After linking:

```sh
safe-shape --help
safe-shape --json doctor
```

`npm run link:cli` creates a global npm link for the `safe-shape` binary. It is
intended for local development.

## Commands

```sh
safe-shape --json doctor
safe-shape schema export --module ./schema.mjs --export userSchema --out ./user.schema.json
safe-shape schema validate --module ./schema.mjs --export userSchema --input ./user.json
safe-shape schema types --module ./schema.mjs --export userSchema --name User --out ./user.d.ts
safe-shape contract snapshot --module ./schema.mjs --export userSchema --id user --out ./user.contract.json
safe-shape contract snapshot --module ./tree.mjs --export treeSchema --id tree --format v2 --out ./tree.contract.json
safe-shape --json contract check --module ./tree.mjs --export treeSchema --against ./tree.contract.json --side input
```

`--export` defaults to `default`.

`schema export` preserves metadata annotations as JSON Schema `title`,
`description`, and `examples`. It maps `enum()`, `unknown()`, and `never()` to
their exact JSON Schema representations.
`discriminatedUnion()` and `intersection()` map to `oneOf` and `allOf`.
String patterns and exact `email`, `uuid`, `date`, and `date-time` formats are
preserved in export and validation.
Numeric `multipleOf` and record key constraints are preserved as JSON Schema
`multipleOf` and `propertyNames` and retain native validation diagnostics.
Explicit object unknown-property policies retain their parsed output and
side-aware JSON Schema behavior.
Pass the official Draft 2020-12 or Draft 7 URI through `--schema` to select the
matching definition, reference, and tuple syntax. Unknown URIs retain the
default Draft 2020-12 renderer while being emitted verbatim.
Pass `--id <absolute-uri>` to add a validated root `$id` to `schema export`.
The same flag retains its stable contract-id meaning for `contract snapshot`.
Unrepresentable refinements and opaque output never produce a partial artifact.
With `--json`, they return `json_schema_export_failed` plus machine-readable
`error.issues` on stderr.

`schema validate` accepts `--input -` for stdin and `--out <file>` for a full
validation report.

`contract snapshot` writes v1 by default. Pass `--format v2` for recursive
input/output graph snapshots. `contract check` detects either stored format and
supports `backward`, `forward`, and `full` compatibility; v2 additionally
accepts `--side input|output`. Its JSON result includes a migration decision,
status counts, summary, and actionable diagnostics. It exits with `0` for
compatible reports, `2` for breaking/risky/unknown reports, and `1` for
operational errors.

## JSON Policy

With `--json`, commands write stable JSON to stdout. CLI errors write a stable
JSON error envelope to stderr. JSON Schema export failures additionally include
the exporter `issues` array.

Success:

```json
{
  "ok": true,
  "command": "doctor"
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

Validation failures are command results, not CLI errors:

```json
{
  "ok": false,
  "command": "schema validate",
  "valid": false,
  "issues": []
}
```

For a failed ordinary union, each `invalid_union` issue includes an ordered
recursive `branches` array with the declaration index and complete issue list
for every choice.
Addressable `custom` issues from `refine()` and `refineWithIssues()` preserve
their relative paths and collector order in the same JSON output.

The CLI does not require auth.
