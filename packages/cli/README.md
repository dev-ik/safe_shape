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
```

`--export` defaults to `default`.

`schema export` preserves metadata annotations as JSON Schema `title`,
`description`, and `examples`.

`schema validate` accepts `--input -` for stdin and `--out <file>` for a full
validation report.

## JSON Policy

With `--json`, commands write stable JSON to stdout. CLI errors write a stable
JSON error envelope to stderr.

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

The CLI does not require auth.
