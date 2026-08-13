# RFC 0013: TypeScript declaration generation

## Motivation

SafeShape should support generated TypeScript declaration artifacts from runtime
schemas without forcing users through the CLI.

## Proposal

Add `@safe-shape/typescript` with:

```ts
toTypeScriptType(schema, { name?: string })
```

The function returns a deterministic `export type ...` declaration based on
`describeSchema(schema)`.

Supported schemas include primitives, literals, arrays, tuples, unions, objects,
records, nullable, optional, and transform schemas.

Transform output types are emitted as `unknown` because mapper return types are
not available at runtime.

## Package Boundary

`@safe-shape/typescript` depends only on `@safe-shape/core`.

The CLI depends on this package for `schema types`.

## Alternatives

- Keep generation inside `@safe-shape/cli`. This blocks programmatic use and
  duplicates future tooling work.
- Infer transform mapper return types. This is not available at runtime and
  would violate the runtime-first model.

## Migration

No migration is required. Existing CLI output is preserved.
