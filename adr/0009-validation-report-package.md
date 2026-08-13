# ADR 0009: Validation report package

## Status

Accepted

## Context

SafeShape core exposes `safeParse`, which returns a result containing either
data or a `ValidationError`.

The CLI and future integrations need a transport-friendly report shape with
plain `valid`, `data`, and `issues` fields.

## Decision

Create `@safe-shape/validation` as a separate package built on
`@safe-shape/core`.

The CLI uses this package for `schema validate` and wraps the report with
CLI-specific metadata.

## Consequences

- Validation report shaping becomes reusable without expanding core.
- Package dependency direction remains one-way: validation depends on core.
- CLI validation output continues to use the same stable JSON envelope.
