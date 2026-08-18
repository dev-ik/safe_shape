# JSON Schema API

`@safe-shape/json-schema` exports SafeShape schemas to JSON Schema-compatible objects.

## Export

Use `toJsonSchema(schema, options?)`.

```ts
import { object, string } from "@safe-shape/core";
import { toJsonSchema } from "@safe-shape/json-schema";

const userSchema = object({
  id: string(),
});

const jsonSchema = toJsonSchema(userSchema, {
  id: "https://example.com/contracts/user",
  side: "input",
  target: "draft-2020-12",
});
```

## Export Diagnostics

Use `safeToJsonSchema()` for a non-throwing, discriminated result:

```ts
import { safeToJsonSchema } from "@safe-shape/json-schema";

const result = safeToJsonSchema(userSchema, { target: "draft-2020-12" });

if (result.success) {
  console.log(result.schema, result.warnings);
} else {
  console.error(result.issues);
}
```

The result, warnings/issues arrays, issue objects, paths, details, and successful
artifact are immutable. Failed results never include a partial schema.
`toJsonSchema()` delegates to this result and throws `JsonSchemaExportError`
with the complete `issues` array.

Each `JsonSchemaExportIssue` includes stable `code`, `severity`, `message`,
artifact `path`, Contract IR `side`, selected `target`, and optional `details`.
Current codes are:

- `json_schema.refinement.unrepresentable`;
- `json_schema.output.opaque`;
- `json_schema.id.invalid`;
- `json_schema.dialect.conflict`;
- `json_schema.target.unsupported`;
- `json_schema.contract.invalid`.

Artifact paths use dialect-specific JSON Schema keywords, including
`properties`, `items`, `prefixItems`, `$defs`, and `definitions`.

`target` supports `draft-2020-12` and `draft-07`. It selects dialect-specific
keywords and emits the official `$schema` URI. The existing `schema` option is
an exact URI override; recognized official dialect URIs also select the
matching renderer when `target` is omitted. Conflicting explicit target and
known URI declarations throw `TypeError`.

`id` emits the root `$id` and must be a non-empty absolute URI without a
fragment or literal whitespace. This conservative profile keeps anonymous
artifacts resolvable in both supported dialects. Invalid identifiers throw
`TypeError` before Contract IR traversal.

Draft 2020-12 emits `$defs`, `#/$defs/...`, and tuple `prefixItems`. Draft 7
emits `definitions`, `#/definitions/...`, and tuple `items` with
`additionalItems: false`.

## Standard JSON Schema V1

`createStandardJsonSchema(schema)` creates a frozen entity implementing both
Standard Schema V1 and Standard JSON Schema V1:

```ts
import { createStandardJsonSchema } from "@safe-shape/json-schema";

const standard = createStandardJsonSchema(userSchema);
const inputSchema = standard["~standard"].jsonSchema.input({
  target: "draft-2020-12",
  libraryOptions: { id: "https://example.com/contracts/user-input" },
});
const outputSchema = standard["~standard"].jsonSchema.output({
  target: "draft-2020-12",
});
```

Both methods emit the selected target's official `$schema` URI and delegate to
the corresponding Contract IR side. The adapter retains synchronous `validate`,
`StandardJSONSchemaV1.InferInput`, and `InferOutput`. Its entity, protocol
object, converter, and generated artifacts are immutable.

`draft-2020-12` and `draft-07` are supported. `openapi-3.0` and unknown future
targets throw `TypeError` rather than silently changing semantics.
`libraryOptions.id` maps to root `$id`; unknown library options are ignored.
Output conversion throws `JsonSchemaExportError` for opaque transform output
and retains the structured issues for inspection.

The adapter lives in `@safe-shape/json-schema` so core remains independent of
artifact formats; the original schema itself continues to implement Standard
Schema V1 directly.

## Supported Mappings

- `string()` -> `{ type: "string" }`
- `number()` -> `{ type: "number" }`
- `integer()` -> `{ type: "integer" }`
- `boolean()` -> `{ type: "boolean" }`
- `literal(value)` -> `{ const: value }`
- `enum(values)` -> `{ enum: values }`
- `unknown()` -> `{}`
- `never()` -> `{ not: {} }`
- `array(item)` -> array schema
- `tuple(items)` -> fixed-length array schema
- `union(choices)` -> `anyOf`
- `discriminatedUnion(key, choices)` -> `oneOf`
- `intersection(left, right)` -> `allOf`
- `object(shape, options?)` -> object schema with side-aware `additionalProperties`
- `record(value, { key })` -> `additionalProperties` and optional `propertyNames`
- `nullable(schema)` -> `anyOf` with `null`
- `optional(schema)` -> underlying property schema; object `required` controls optionality
- `transform(schema)` -> input schema
- `lazy(getSchema, { id })` -> `$defs` and `$ref`

Native constraints map without approximation:

- string `minLength` and `maxLength` -> JSON Schema `minLength` and `maxLength`;
- string `pattern` -> JSON Schema `pattern`;
- string `email`, `uuid`, `date`, and `date-time` formats -> standard `format`
  plus the exact SafeShape grammar pattern;
- number `minimum` and `maximum` -> JSON Schema `minimum` and `maximum`;
- number `multipleOf` -> JSON Schema `multipleOf`;
- number `integer: true` and `integer()` -> `type: "integer"`;
- array `minLength` and `maxLength` -> `minItems` and `maxItems`.
- record key string constraints -> `propertyNames`.

When a string has both `pattern` and `format`, the format grammar remains the
root `pattern` and the caller pattern is emitted through `allOf`. This preserves
both constraints instead of overwriting either one. Calendar semantics for
`date` and `date-time` use the corresponding JSON Schema format assertion.

Refinements are not approximated. Export fails with one structured issue for
each refinement, including its stable semantic id when available.

`side` defaults to `"input"`, preserving the existing transform behavior.
Use `side: "output"` to export the Contract IR output graph. If that graph
contains an opaque transform output, export throws instead of approximating its
structure. `safeToJsonSchema()` reports every detectable refinement and opaque
node in one failure result.

Recursive schemas use their explicit lazy ids as `$defs` or `definitions` keys
for the selected dialect. `$ref` JSON Pointer segments escape `~` and `/`
deterministically.

The same lazy schema may appear at multiple paths; it is emitted once and every
use points to that definition. Different lazy schema instances with the same id
throw instead of silently selecting one definition.

Object `reject` exports `additionalProperties: false`; `passthrough` exports
`true`. Explicit `strip` exports `true` for the default input side and `false`
for `side: "output"`, because JSON Schema validates instances but cannot express
property removal.

## Metadata Annotations

SafeShape metadata is exported as JSON Schema annotations:

- `metadata.title` -> `title`
- `metadata.description` -> `description`
- `metadata.examples` -> `examples`

```ts
const userSchema = object({
  id: string().annotate({
    title: "User id",
    description: "Stable public user identifier.",
    examples: ["user_1"],
  }),
}).annotate({
  title: "User",
});
```
