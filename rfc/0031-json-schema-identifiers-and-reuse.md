# RFC 0031: JSON Schema identifiers and reusable definitions

## Status

Accepted for the fourth standards-and-artifacts M4 slice.

## Motivation

SafeShape already exports recursive `lazy()` contracts through definitions and
references, but generated documents cannot declare a stable root identifier.
The existing coverage also does not prove that one reusable schema referenced
from multiple properties is emitted exactly once.

## Proposal

`JsonSchemaOptions` gains an additive `id` property:

```ts
toJsonSchema(schema, {
  id: "https://example.com/contracts/user",
  target: "draft-2020-12",
});
```

The value is emitted as the root `$id`. SafeShape accepts a conservative,
portable subset of the JSON Schema requirement: a non-empty absolute URI with
no fragment or literal whitespace. Invalid values throw `TypeError` before
Contract IR traversal.

Standard JSON Schema V1 callers pass the same option through
`libraryOptions.id`. Unknown library options remain ignored. The CLI exposes
the identifier as contextual `schema export --id <uri>` while retaining the
existing contract snapshot meaning of `--id`.

Reusable or recursive schemas continue to use `lazy(() => schema, { id })`.
Contract IR owns identifier collision detection and deterministic definition
ordering. Reusing the same lazy schema instance produces repeated `$ref`
objects and one definition; distinct lazy schemas with the same id fail before
export.

## Compatibility

The programmatic and CLI options are additive. Exports without `id` are
unchanged. Existing fragment-only internal references remain valid after a
root `$id` is added because they resolve within that schema resource.

## Non-Goals

- Accepting relative root identifiers.
- Emitting `$id` on every definition.
- External schema fetching or a registry.
- Automatically deduplicating anonymous schemas by object identity or shape.
- Replacing explicit stable lazy ids with generated names.
