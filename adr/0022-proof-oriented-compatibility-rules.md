# ADR 0022: proof-oriented compatibility rule ordering

## Status

Accepted

## Context

Compatibility rules combine exact equality, opaque behavior, finite sets,
unions, wrappers, and structural nodes. Running generic kind-change logic first
loses proofs available for `never`, `unknown`, literals, and enums. Conversely,
treating failure to fit one target union branch as breaking is unsound when
multiple branches may collectively cover a non-finite source.

## Decision

Order compatibility analysis from strongest evidence to weakest:

1. exact and annotation-only equality;
2. opaque-behavior guards;
3. bottom/top rules for `never` and `unknown`;
4. union normalization and finite singleton expansion;
5. exact literal and enum membership;
6. same-kind structural containment;
7. proven disjoint kind changes;
8. conservative `unknown` fallback.

Finite enum values are expanded only inside comparison and do not alter the
canonical snapshot. Native literal evaluation mirrors runtime constraints and
uses exact decimal arithmetic for `multipleOf`. A non-finite source is not
declared breaking against a multi-branch target merely because no individual
branch contains the entire source.

## Consequences

- Every `safe` finite-value result has an explicit subset proof.
- Enum order remains irrelevant to fingerprints and comparison.
- Some old `unknown` enum results become actionable.
- Some union results become more conservative until a collective-coverage
  proof exists.
- Runtime constraint semantics duplicated by the compatibility evaluator must
  remain covered by cross-package tests.
