# ADR 0004: explicit-coercion

## Status

Accepted and retained for SafeShape 2.0.

## Context

Implicit coercion makes a boundary contract depend on hidden conversion rules.
Values such as empty strings, numeric strings, dates, and booleans have
application-specific meanings, so accepting them automatically can conceal bad
input and create differences between runtime behavior and generated artifacts.

## Decision

Schemas do not coerce raw input implicitly. A primitive schema accepts only its
declared runtime type. When an application needs a different output, it uses an
explicit transform after validation; any future preprocessing or coercion API
must be opt-in and visible in the schema definition.

## Consequences

For example, `number()` rejects `"42"` rather than converting it. Boundary
adapters must make normalization decisions explicitly. Runtime acceptance stays
predictable, while transformations that cannot be represented in an artifact
remain visible as opaque behavior.
