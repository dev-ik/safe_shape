# ADR 0010: Schema metadata wrapper

## Status

Accepted

## Context

SafeShape needs metadata annotations for tooling while preserving immutable
schemas and existing parser behavior.

Adding metadata state to every schema class would broaden constructor surfaces
and increase duplication.

## Decision

Represent metadata as an immutable wrapper schema created by `annotate()`.

The wrapper delegates parsing to the inner schema and adds metadata only during
schema introspection.

The wrapper preserves the optional marker when wrapping optional schemas.

## Consequences

- Runtime parsing behavior remains unchanged.
- Existing schema classes stay focused on validation semantics.
- Tooling packages can consume metadata through `describeSchema`.
- Optional object properties remain optional after annotation.
