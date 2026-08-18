# RFC 0001: schema-api

## Status

Accepted and retained for SafeShape 2.0.

## Motivation

SafeShape needs a minimal public schema API before implementation so runtime behavior,
TypeScript inference, diagnostics, and immutability are defined together.

## Proposal

Expose builder functions for the v0.1 core package:

- `string()`
- `number()`
- `boolean()`
- `literal(value)`
- `array(itemSchema)`
- `object(shape)`
- `optional(schema)`

Every schema exposes:

- `safeParse(input)` returning `ParseResult<T>`
- `parse(input)` returning `T` or throwing `ValidationError`
- `refine(predicate, options)` returning a new schema
- `optional()` returning a new schema

Object schemas are strict by default. Unknown input keys produce `unexpected_property`
issues. Values are never coerced.

The public type helper is `Infer<typeof schema>`.

## Alternatives

- Decorator-based schemas: rejected by ADR 0003.
- Implicit coercion: rejected by ADR 0004.
- Permissive object schemas by default: deferred until an explicit API is designed.

## Migration

No migration is required for v0.1 because no previous public API exists.
