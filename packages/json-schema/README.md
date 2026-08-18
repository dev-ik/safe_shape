# @safe-shape/json-schema

JSON Schema export for SafeShape runtime contracts.

## Usage

```ts
import { object, string } from "@safe-shape/core";
import {
  createStandardJsonSchema,
  safeToJsonSchema,
  toJsonSchema,
} from "@safe-shape/json-schema";

const userSchema = object({
  id: string({ minLength: 1, maxLength: 100 }),
});

const jsonSchema = toJsonSchema(userSchema, {
  id: "https://example.com/contracts/user",
  side: "input",
  target: "draft-2020-12",
});
```

Use `safeToJsonSchema()` when tooling needs machine-readable diagnostics:

```ts
const result = safeToJsonSchema(userSchema, { target: "draft-2020-12" });

if (!result.success) {
  for (const issue of result.issues) {
    console.error(issue.code, issue.path, issue.message);
  }
}
```

Successful results contain an immutable `schema` and `warnings`. Failed results
contain immutable `issues` and never expose a partial artifact. `toJsonSchema()`
throws `JsonSchemaExportError` with the same `issues` for callers preferring an
exception API.

## Standard JSON Schema V1

Use `createStandardJsonSchema(schema)` when a schema-agnostic consumer expects
the Standard JSON Schema V1 protocol:

```ts
const standard = createStandardJsonSchema(userSchema);
const inputSchema = standard["~standard"].jsonSchema.input({
  target: "draft-2020-12",
  libraryOptions: { id: "https://example.com/contracts/user-input" },
});
const outputSchema = standard["~standard"].jsonSchema.output({
  target: "draft-2020-12",
});
```

The frozen adapter also retains the schema's Standard Schema V1 `validate`
function and input/output type inference. Both `draft-2020-12` and `draft-07`
are supported; other targets throw instead of being approximated.
Input and output conversion are side-aware, including explicit object stripping
and opaque transform failures.

## Contract

`toJsonSchema(schema, options?)` returns a JSON Schema-compatible object from
SafeShape runtime schema introspection.

Set `target` to `draft-2020-12` or `draft-07` to select the renderer and emit
the matching official `$schema` URI. `schema` remains an exact URI override;
known official URIs also select their matching renderer when `target` is
omitted. Conflicting explicit declarations throw `TypeError`.

Set `id` to a non-empty absolute URI without a fragment to emit a root `$id`.
Standard JSON Schema V1 uses the same option through `libraryOptions.id`.
Invalid identifiers fail before conversion.

Ordinary and addressable custom refinements are opaque and fail with
`json_schema.refinement.unrepresentable`; no partial schema is returned.
`transform()` is exported as its input schema; opaque output fails with
`json_schema.output.opaque`.

SafeShape metadata annotations are exported as JSON Schema `title`,
`description`, and `examples`.

Native string, number, integer, and array constraints are exported as standard
JSON Schema validation keywords.

`enum()` maps to `enum`, `unknown()` maps to an unconstrained `{}` schema, and
`never()` maps to the always-failing `{ not: {} }` schema.

`discriminatedUnion()` maps to `oneOf`; `intersection()` maps to `allOf`.

String patterns map to `pattern`. Exact `email`, `uuid`, `date`, and
`date-time` constraints map to `format` plus their SafeShape grammar pattern;
a caller pattern composes through `allOf` when both are present.

Numeric `multipleOf` maps directly to the standard keyword. Constrained record
keys map to `propertyNames`, while their values remain `additionalProperties`.

Object unknown-property policies map to `additionalProperties`. `strip` is
side-aware: input export allows extras and output export rejects them.

Recursive `lazy()` schemas are exported through deterministic definitions and
references: Draft 2020-12 uses `$defs` and `#/$defs/...`, while Draft 7 uses
`definitions` and `#/definitions/...`. Tuples likewise use `prefixItems` in
Draft 2020-12 and `items` plus `additionalItems: false` in Draft 7. Input export
is the default. Output export rejects opaque transform results rather than
silently approximating them.

Reusing the same `lazy()` schema emits multiple references and one definition.
Distinct lazy schemas cannot share an id; collisions throw explicitly.
