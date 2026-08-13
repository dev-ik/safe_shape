# @safe-shape/json-schema

JSON Schema export for SafeShape runtime contracts.

## Usage

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

## Contract

`toJsonSchema(schema, options?)` returns a JSON Schema-compatible object from
SafeShape runtime schema introspection.

Refinements are not represented in the initial exporter. `transform()` is
exported as its input schema.

SafeShape metadata annotations are exported as JSON Schema `title`,
`description`, and `examples`.
