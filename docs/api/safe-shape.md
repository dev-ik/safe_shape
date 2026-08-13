# SafeShape Umbrella Package

`safe-shape` is the umbrella package for projects that want the complete
SafeShape runtime and tooling surface from one dependency.

## Install

```sh
npm install safe-shape
```

## Usage

```ts
import {
  object,
  string,
  toJsonSchema,
  toTypeScriptType,
  validateSchema,
} from "safe-shape";

const userSchema = object({
  id: string().annotate({ title: "User id" }),
}).annotate({ title: "User" });

const report = validateSchema(userSchema, { id: "user_1" });
const jsonSchema = toJsonSchema(userSchema);
const source = toTypeScriptType(userSchema, { name: "User" });
```

## Exports

The package re-exports the public APIs from:

- `@safe-shape/core`
- `@safe-shape/http`
- `@safe-shape/json-schema`
- `@safe-shape/typescript`
- `@safe-shape/validation`

Installing this package also installs `@safe-shape/cli`, which provides the
`safe-shape` CLI binary.

There are no extra runtime semantics in this package. It exists for install and
import convenience while preserving the underlying package boundaries.
