# ADR 0027: execute custom diagnostic refinements in core

## Status

Accepted.

## Context

Addressable custom validation affects parsing, issue paths, immutability,
Standard Schema, validation reports, CLI output, HTTP prefixing, Contract IR,
compatibility, and JSON Schema export. Implementing separate adapters would
create multiple sources of truth for issue order and path semantics.

## Decision

`@safe-shape/core` owns synchronous custom diagnostic execution alongside
ordinary refinement checks. A schema stores an ordered immutable union of
predicate and collector checks. Both execute only after base parsing succeeds.

`refineWithIssues()` requires a stable semantic id and exposes a minimal frozen
collector context. Collected paths are relative to the current parse context,
copied on receipt, and emitted through the existing `Issue` factory. Collector
issues always use `code: "custom"`.

Thrown callbacks and promise-like collector results become deterministic
custom failures without exception details. This preserves synchronous parsing
and prevents application exceptions from crossing validation boundaries.

Contract IR continues to expose only ordered refinement ids. Downstream
packages consume native issues unchanged. JSON Schema continues to reject any
refinement as unrepresentable.

## Consequences

- There remains one implementation of custom issue ordering and paths.
- Standard Schema, validation, CLI, and HTTP inherit the behavior without new
  adapter APIs.
- Stable ids support snapshots and conservative compatibility analysis without
  pretending opaque rules are structural constraints.
- Collector issue shape stays intentionally narrow and can be expanded only by
  another public API decision.
