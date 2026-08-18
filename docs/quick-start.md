# Quick Start

**English** | [Русский](ru/quick-start.md)

This guide takes you from installation to a validated value and a reviewable
contract snapshot.

## Requirements

- Node.js `>=20.10`
- An ESM-compatible TypeScript project

## Install

Install the umbrella package for the complete runtime and tooling surface:

```sh
npm install safe-shape
```

## Define and Run a Contract

```ts
import { integer, object, string, type Infer } from "safe-shape";

const User = object({
  id: string({ minLength: 1 }),
  age: integer({ minimum: 0 }).optional(),
});

type User = Infer<typeof User>;

const result = User.safeParse({ id: "user_1", age: 42 });

if (!result.success) {
  console.error(result.error.issues);
} else {
  const user: User = result.data;
  console.log(user.id);
}
```

`safeParse()` returns a discriminated result. Use `parse()` instead when an
invalid value should throw. SafeShape does not coerce `{ age: "42" }`; input
changes require an explicit transform.

## Inspect Diagnostics

Every failed result contains stable, structured issues:

```ts
const result = User.safeParse({ id: "", age: -1 });

if (!result.success) {
  for (const issue of result.error.issues) {
    console.error(issue.code, issue.path, issue.message);
  }
}
```

Issue paths are arrays and remain machine-readable through validation reports,
HTTP helpers, Standard Schema, and the CLI.

## Export Tooling Artifacts

Compile the schema module to ESM, then point the installed CLI at the JavaScript
file:

```sh
safe-shape --json schema export \
  --module ./dist/contracts/user.js \
  --export User \
  --schema https://json-schema.org/draft/2020-12/schema \
  --out ./dist/contracts/user.schema.json

safe-shape --json schema types \
  --module ./dist/contracts/user.js \
  --export User \
  --name User \
  --out ./dist/contracts/user.d.ts
```

## Protect Contract Evolution

Create a reviewed v2 baseline:

```sh
safe-shape contract snapshot \
  --module ./dist/contracts/user.js \
  --export User \
  --id user \
  --format v2 \
  --out ./.safe-shape/user.contract.json
```

Check the input contract in CI:

```sh
safe-shape --json contract check \
  --module ./dist/contracts/user.js \
  --export User \
  --against ./.safe-shape/user.contract.json \
  --side input \
  --compatibility backward
```

Commit reviewed baselines. Do not regenerate them inside the CI check job.

## Next Steps

- [Project integration](integration.md)
- [Core API](api/core.md)
- [Contract compatibility](api/compat.md)
- [CLI API](api/cli.md)
- [Documentation home](README.md)
