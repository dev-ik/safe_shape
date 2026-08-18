# ADR 0024: compare contract graphs coinductively

## Status

Accepted.

## Context

Contract IR v2 graphs may contain cycles and may use different stable lazy ids
or sharing topology for the same runtime value language. Expanding graphs into
trees cannot terminate for recursive contracts, while comparing reference ids
would confuse serialization identity with contract semantics.

The compatibility engine already contains conservative structural containment
rules for tree nodes. Graph comparison should reuse those rules without moving
compatibility policy into core.

## Decision

`@safe-shape/compat` resolves references through the previous and next graph's
own definition tables and delegates concrete nodes to the existing structural
engine.

The traversal tracks node pairs that are active for one compatibility
direction. Re-entering the same pair returns a provisional safe result for that
edge. The result is sound only because direct self-references are forbidden by
core and every cycle passes through a concrete positive container whose local
rules are still checked.

Reference ids and the number of references are excluded from compatibility
semantics. They remain part of snapshot fingerprints so artifact changes stay
observable.

V2 comparison selects one Contract IR side explicitly. Input is the default;
output can be requested independently. Stable opaque output ids are equality
claims only, while anonymous or changed opaque behavior is unknown.

## Consequences

- Recursive and reusable contracts terminate and reuse the established rule
  matrix.
- Equivalent graphs remain compatible across lazy-id renames and reuse-layout
  changes.
- Concrete changes inside recursive definitions produce normal schema-path
  findings.
- Conservative helper proofs do not unfold references outside the guarded
  pair traversal, so unsupported reference-dependent shortcuts remain unknown.
- Core remains independent of compatibility policy and graph traversal state.
