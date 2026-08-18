# RFC 0007: core-schema-extensions

## Status

Accepted and retained for SafeShape 2.0.

## Motivation

SafeShape core needs explicit schemas for common boundary shapes before framework-specific
HTTP helpers are added.

Two common cases are nullable values and string-keyed maps.

## Proposal

Add `schema.nullable()` and `nullable(schema)`.

Nullable validation:

1. Accepts `null`.
2. Otherwise validates with the inner schema.
3. Infers `Infer<TSchema> | null`.

Add `record(valueSchema)`.

Record validation:

1. Accepts non-array objects.
2. Validates every own enumerable string-keyed property with `valueSchema`.
3. Reports value failures at the failing key path.
4. Infers `Readonly<Record<string, Infer<TValueSchema>>>`.

Neither API coerces input.

## Alternatives

- Model nullable only through `union([schema, literal(null)])`. This works, but a named
  nullable schema makes boundary contracts clearer and keeps expected schema names stable.
- Add key schemas to `record`. This is deferred because JavaScript object keys are strings
  at runtime and key validation needs separate design.

## Migration

No migration is required because both APIs are additive.
