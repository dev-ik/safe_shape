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
  createContractSnapshot,
  createContractSnapshotV2,
  createStandardJsonSchema,
  toJsonSchema,
  toTypeScriptType,
  validateSchema,
  type InferInput,
  type InferOutput,
} from "safe-shape";

const userSchema = object({
  id: string().annotate({ title: "User id" }),
}).annotate({ title: "User" });

const report = validateSchema(userSchema, { id: "user_1" });
const snapshot = createContractSnapshot(userSchema, { id: "user" });
const graphSnapshot = createContractSnapshotV2(userSchema, { id: "user" });
const jsonSchema = toJsonSchema(userSchema);
const source = toTypeScriptType(userSchema, { name: "User" });
type UserInput = InferInput<typeof userSchema>;
type UserOutput = InferOutput<typeof userSchema>;
const standardResult = userSchema["~standard"].validate({ id: "user_1" });
const standardJsonSchema = createStandardJsonSchema(userSchema);
```

## Exports

The package re-exports the public APIs from:

- `@safe-shape/core`
- `@safe-shape/compat`
- `@safe-shape/http`
- `@safe-shape/json-schema`
- `@safe-shape/typescript`
- `@safe-shape/validation`

Reserved builder names can be imported with aliases, for example
`import { enum as enumSchema, never as neverSchema } from "safe-shape"`.

Structured composition APIs such as `discriminatedUnion()` and
`intersection()` are re-exported with the same runtime, snapshot, and generator
behavior as `@safe-shape/core`.
String `pattern` and exact `email`, `uuid`, `date`, and `date-time` constraints
are likewise available through the umbrella export.
Exact numeric `multipleOf` and `record(value, { key })` constraints are also
re-exported with their Contract IR, snapshot, compatibility, and JSON Schema
behavior intact.
Explicit `object(shape, { unknownProperties })` policies are re-exported with
the same default-reject and side-aware artifact behavior.
Failed ordinary `union()` schemas expose the same immutable recursive branch
diagnostics through the umbrella export and `validateSchema()` reports.
`refine(..., { path })` and `refineWithIssues(collector, { id })` expose the
same synchronous addressable custom diagnostics as `@safe-shape/core`.
All schemas expose synchronous Standard Schema V1 validation and transform-aware
input/output inference through the re-exported `StandardSchemaV1` type.
`createStandardJsonSchema()` and `StandardJSONSchemaV1` are also re-exported for
side-aware Standard JSON Schema conversion.
`safeToJsonSchema()`, `JsonSchemaExportResult`, and `JsonSchemaExportError` are
re-exported for immutable machine-readable artifact diagnostics.

Installing this package also installs `@safe-shape/cli`, which provides the
`safe-shape` CLI binary.

There are no extra runtime semantics in this package. It exists for install and
import convenience while preserving the underlying package boundaries.
