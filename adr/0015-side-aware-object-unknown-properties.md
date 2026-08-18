# ADR 0015: keep object unknown-property behavior explicit and side-aware

## Status

Accepted.

## Context

Rejecting, stripping, and preserving additional object properties change both
accepted input and parsed output. JSON Schema can express acceptance but cannot
express removal, while Contract IR and compatibility tooling must not silently
collapse distinct runtime behavior.

## Decision

Core owns a required `unknownProperties` policy on every object Contract IR
node. The runtime default is `reject`; `strip` and `passthrough` require an
explicit `object()` option.

Tooling preserves the policy rather than inferring it from object shape. JSON
Schema conversion receives the requested contract side: `strip` allows
additional input properties but forbids them in the output shape. TypeScript
generation models passthrough output with a readonly unknown string index.
Compatibility analysis includes both accepted-value containment and the known
output difference between stripping and passthrough.

## Consequences

Strict behavior stays source compatible, permissive behavior remains visible
in every artifact, and disjoint object intersections can opt into composition
without hidden coercion. JSON Schema export needs side context throughout its
recursive conversion, but does not require a non-standard mutation keyword.
