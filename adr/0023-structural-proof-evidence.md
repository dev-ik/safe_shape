# ADR 0023: structural compatibility requires explicit proof evidence

## Status

Accepted

## Context

Structural compatibility needs more than recursive status aggregation. A
cross-kind relationship can be safe through a subset proof, breaking through a
constructible witness, or undecidable with the currently available Contract
IR. Object policies additionally expose parsed-output differences that pure
input-set containment does not capture.

## Decision

Use three internal evidence classes without adding them to the public report:

1. containment evidence: fixed/effective lengths and recursive child subsets;
2. counterexample evidence: inhabited source nodes and disjoint runtime value
   families or exact literal rejection;
3. output-identity evidence: parsers known to preserve accepted values.

Tuple/array comparison uses effective length intervals, including empty item
contracts. Union comparison may emit `breaking` only with finite or disjoint
witness evidence. Object shape comparison uses universal-input and
output-identity predicates; opaque transforms stay `unknown`.

The helpers remain private to `@safe-shape/compat`. They must be conservative:
failure to prove inhabitation, universality, disjointness, or identity falls
back to `unknown` rather than assuming a result.

## Consequences

- Cross-kind tuple/array changes become direction-aware.
- Disjoint union removals produce actionable breaking reports.
- Object property changes under permissive policies distinguish safe identity
  cases from rejection, stripping, and opaque output.
- Future graph comparison can reuse the proof model without exposing unstable
  implementation details in the public API.
- Proof helpers add maintenance cost and require safe, breaking, full-mode, and
  empty/opaque edge-case tests.
