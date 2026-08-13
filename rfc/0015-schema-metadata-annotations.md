# RFC 0015: Schema metadata annotations

## Motivation

SafeShape tooling needs schema metadata for generated artifacts without changing
runtime validation behavior.

JSON Schema export should be able to emit standard annotation fields such as
`title`, `description`, and `examples`.

## Proposal

Add metadata annotations to core schemas:

```ts
schema.annotate({
  title: "User id",
  description: "Stable public user identifier.",
  examples: ["user_1"],
});
```

Also expose a standalone helper:

```ts
annotate(schema, metadata)
```

Supported metadata fields:

- `title`
- `description`
- `examples`

Annotations return new immutable schemas and do not change parsing, transforms,
refinements, type inference, optionality, or nullability.

`describeSchema(schema)` includes metadata on the annotated schema definition.

`@safe-shape/json-schema` maps metadata to JSON Schema annotations.

## Alternatives

- Add metadata only to JSON Schema export options. This would not help other
  tooling packages and would make metadata external to the runtime schema.
- Add arbitrary extension bags. This is deferred because unconstrained metadata
  makes public artifact compatibility harder to preserve.

## Migration

No migration is required. The API is additive.
