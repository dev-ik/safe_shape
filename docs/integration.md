# Project Integration

This guide shows how to use SafeShape as packages inside another TypeScript
project.

## Requirements

- Node.js `>=20.10`
- ESM-compatible project setup
- TypeScript with strict checking recommended

Recommended TypeScript compiler settings:

```json
{
  "compilerOptions": {
    "strict": true,
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

## Install

Install `safe-shape` when you want the full runtime and tooling set available
in one project:

```sh
npm install safe-shape
```

Then import only the packages needed by each module:

```ts
import { object, string, validateSchema } from "safe-shape";
```

The `safe-shape` package re-exports the public runtime and tooling APIs and
also installs the `safe-shape` CLI binary.

If you prefer narrower installs, choose only the packages needed by the project
surface:

For runtime validation:

```sh
npm install @safe-shape/core
```

For JSON-friendly validation reports:

```sh
npm install @safe-shape/core @safe-shape/validation
```

For HTTP boundary helpers:

```sh
npm install @safe-shape/core @safe-shape/http
```

For build-time tooling:

```sh
npm install --save-dev @safe-shape/cli @safe-shape/json-schema @safe-shape/typescript
```

Keep SafeShape package versions aligned. Upgrade installed `safe-shape` and
`@safe-shape/*` packages together.

## Define Contracts

Create a schema module that can be imported by application code and by the CLI:

```ts
// src/contracts/user.ts
import { literal, number, object, string, union, type Infer } from "@safe-shape/core";

export const userSchema = object({
  id: string().annotate({
    title: "User id",
    description: "Stable public user identifier.",
    examples: ["user_1"],
  }),
  role: union([literal("admin"), literal("member")]),
  age: number().optional(),
}).annotate({
  title: "User",
  description: "User resource.",
});

export type User = Infer<typeof userSchema>;
```

SafeShape validates runtime inputs without hidden coercion. If input should be
changed, use an explicit `transform()`.

## Validate At Boundaries

Use `parse()` when invalid data should throw:

```ts
import { userSchema } from "./contracts/user.js";

const user = userSchema.parse(input);
```

Use `safeParse()` when invalid data is part of normal control flow:

```ts
import { userSchema } from "./contracts/user.js";

const result = userSchema.safeParse(input);

if (!result.success) {
  return {
    status: 400,
    issues: result.error.issues,
  };
}

return {
  status: 200,
  data: result.data,
};
```

Use `@safe-shape/validation` when the caller needs a JSON-friendly report:

```ts
import { validateSchema } from "@safe-shape/validation";
import { userSchema } from "./contracts/user.js";

const report = validateSchema(userSchema, input);
```

## HTTP Integration

Use `@safe-shape/http` to keep request and response validation at the framework
boundary:

```ts
import { object, string } from "@safe-shape/core";
import { httpContract, safeParseHttpRequest } from "@safe-shape/http";
import { userSchema } from "./contracts/user.js";

const getUserContract = httpContract({
  params: object({
    id: string(),
  }),
  response: userSchema,
});

const result = safeParseHttpRequest(getUserContract, {
  params: request.params,
});

if (!result.success) {
  return {
    status: 400,
    body: { issues: result.error.issues },
  };
}
```

The HTTP package is framework-neutral. Map your framework request object into
the contract sections you want to validate.

## CLI Integration

Expose contract tooling from your project scripts:

```json
{
  "scripts": {
    "contracts:doctor": "safe-shape --json doctor",
    "contracts:schema": "safe-shape --json schema export --module ./dist/contracts/user.js --export userSchema --schema https://json-schema.org/draft/2020-12/schema --out ./dist/contracts/user.schema.json",
    "contracts:types": "safe-shape --json schema types --module ./dist/contracts/user.js --export userSchema --name User --out ./dist/contracts/user.d.ts",
    "contracts:validate": "safe-shape --json schema validate --module ./dist/contracts/user.js --export userSchema --input ./fixtures/user.json"
  }
}
```

The CLI loads JavaScript ESM modules by file path. Compile TypeScript contract
modules before running CLI commands against them.

## CI Checklist

Use these checks in projects that depend on SafeShape:

```sh
npm run build
npm run contracts:doctor
npm run contracts:schema
npm run contracts:types
npm run contracts:validate
```

For package maintainers in this repository, `npm run release:check` already
runs build, typecheck, tests, runnable examples, benchmarks, consumer install
checks, npm audit, and package dry-run checks.

## Package Boundaries

Install only the packages needed by the target project:

- `@safe-shape/core` for schemas, parsing, diagnostics, and type inference.
- `@safe-shape/validation` for JSON-friendly reports.
- `@safe-shape/http` for framework-neutral HTTP request/response boundaries.
- `@safe-shape/json-schema` for JSON Schema export tooling.
- `@safe-shape/typescript` for TypeScript declaration generation.
- `@safe-shape/cli` for command-line workflows.

Do not rely on private implementation fields. Use public schemas,
`describeSchema()`, exporter packages, and CLI commands.
