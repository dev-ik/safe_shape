# ADR 0002: immutable-schemas

## Status

Accepted and retained for SafeShape 2.0.

## Context

Schemas are shared between runtime boundaries, inferred types, and artifact
tooling. Mutating a reused schema would make validation depend on construction
order and could silently change another consumer's contract.

## Decision

Schema instances are immutable. Composition methods such as `optional()`,
`nullable()`, `refine()`, `transform()`, and `annotate()` return new schemas
instead of changing the receiver. Public schema definitions and exposed
collections are immutable values.

## Consequences

Schemas can be safely reused and composed without defensive copying by callers.
Each variation has an explicit identity, at the cost of allocating a new schema
wrapper when behavior or metadata is added. New schema APIs must preserve this
copy-on-composition model.
