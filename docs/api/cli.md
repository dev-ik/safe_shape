# CLI

`@safe-shape/cli` provides the `safe-shape` binary.

Installing the umbrella `safe-shape` package also exposes the same binary.

## Commands

```sh
safe-shape --json doctor
safe-shape schema export --module ./schema.mjs --export userSchema
safe-shape schema validate --module ./schema.mjs --export userSchema --input ./user.json
safe-shape schema types --module ./schema.mjs --export userSchema --name User
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
  --out ./user.schema.json
```

`--export` defaults to `default`.

Metadata annotations from `schema.annotate(...)` are preserved in JSON Schema
output as `title`, `description`, and `examples`.

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

The CLI does not require auth and does not print secrets.
