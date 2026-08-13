# RFC 0004: unions

## Motivation

External data often supports a bounded set of valid shapes or primitive alternatives.
SafeShape needs a union schema that preserves TypeScript inference while keeping runtime
validation explicit.

## Proposal

Expose `union([schemaA, schemaB])`.

Union validation:

1. Tries choices from left to right.
2. Returns the first successful parse result.
3. Returns one `invalid_union` issue at the current path when no choices match.

The inferred output type is the union of all choice output types.

Example:

```ts
const idSchema = union([string(), number()]);
type Id = Infer<typeof idSchema>; // string | number
```

Union schemas are immutable and support existing schema operations such as `refine()` and
`optional()`.

## Alternatives

- Report all branch issues. This is deferred because it requires a richer issue model for
  nested branch diagnostics.
- Choose the branch with the fewest issues. This is deferred because v0.1/v0.4 favors
  predictable left-to-right behavior over heuristics.

## Migration

No migration is required because `union` is an additive API.
