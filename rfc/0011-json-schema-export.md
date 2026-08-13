# RFC 0011: json-schema-export

## Motivation

SafeShape runtime contracts should be exportable to JSON Schema for documentation,
OpenAPI-like tooling, and external contract consumers.

## Proposal

Add two pieces:

1. `@safe-shape/core` exposes `describeSchema(schema)`.
2. `@safe-shape/json-schema` exposes `toJsonSchema(schema)`.

`describeSchema` returns a SafeShape schema description. It is not JSON Schema.

`toJsonSchema` maps supported schema descriptions to JSON Schema-compatible objects.

Initial supported mappings:

- `string` -> `{ "type": "string" }`
- `number` -> `{ "type": "number" }`
- `boolean` -> `{ "type": "boolean" }`
- `literal(value)` -> `{ "const": value }`
- `array(item)` -> `{ "type": "array", "items": ... }`
- `tuple(items)` -> fixed-length array schema
- `union(choices)` -> `{ "anyOf": [...] }`
- `object(shape)` -> strict object schema
- `record(value)` -> object with `additionalProperties`
- `nullable(schema)` -> `{ "anyOf": [schema, { "type": "null" }] }`
- `optional(schema)` -> underlying schema with object required handling
- `transform(schema)` -> underlying input schema

Refinements are not represented in JSON Schema in the initial exporter.

## Alternatives

- Put JSON Schema generation directly in core. This is rejected because core should stay
  runtime-contract focused and loosely coupled.
- Let exporter packages read private schema fields. This is rejected because private
  implementation details are not stable public API.

## Migration

No migration is required because this is additive.
