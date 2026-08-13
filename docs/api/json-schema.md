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
  schema: "https://json-schema.org/draft/2020-12/schema",
});
```

## Supported Mappings

- `string()` -> `{ type: "string" }`
- `number()` -> `{ type: "number" }`
- `boolean()` -> `{ type: "boolean" }`
- `literal(value)` -> `{ const: value }`
- `array(item)` -> array schema
- `tuple(items)` -> fixed-length array schema
- `union(choices)` -> `anyOf`
- `object(shape)` -> strict object schema
- `record(value)` -> `additionalProperties`
- `nullable(schema)` -> `anyOf` with `null`
- `optional(schema)` -> underlying property schema; object `required` controls optionality
- `transform(schema)` -> input schema

Refinements are not represented in the initial exporter.

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
