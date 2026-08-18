# RFC 0008: tuples

## Status

Accepted and retained for SafeShape 2.0.

## Motivation

External data sometimes uses fixed-position arrays such as coordinates, date parts, and
compact protocol payloads. SafeShape needs tuple validation that preserves positional
TypeScript inference and reports precise index paths.

## Proposal

Add `tuple([schemaA, schemaB])`.

Tuple validation:

1. Accepts arrays only.
2. Requires the input array length to match the number of item schemas.
3. Validates each item schema at its positional index.
4. Infers a readonly tuple of item output types.

Example:

```ts
const pointSchema = tuple([number(), number()]);
type Point = Infer<typeof pointSchema>; // readonly [number, number]
```

Tuple schemas are immutable and support existing schema operations such as `refine()`,
`transform()`, `nullable()`, and `optional()`.

## Alternatives

- Use `array(union([...]))`. This validates element types but cannot enforce fixed length
  or positional inference.
- Add rest tuple items. This is deferred until the fixed tuple API is stable.

## Migration

No migration is required because `tuple` is an additive API.
