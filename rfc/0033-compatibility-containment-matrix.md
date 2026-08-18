# RFC 0033: compatibility containment matrix and finite-value rules

## Status

Accepted for the first M5 compatibility-rule slice.

## Motivation

Compatibility results are part of the public CI contract. A rule must not
report `safe` because two schemas merely look similar: the required
accepted-value subset relationship must be proven. The initial engine left
changed enum sets unresolved and did not publish one normative matrix for its
implemented, conservative, and planned relationships.

Literal-to-primitive comparison also checked only length, range, and integer
constraints. Ignoring string patterns, string formats, or numeric `multipleOf`
could therefore produce an unsound `safe` result.

## Proposal

Document the complete rule matrix in `docs/compatibility-matrix.md`. For one
direction, call the values being migrated the source set and the receiving
contract the target set. `safe` requires `source ⊆ target`; `breaking`
requires a known counterexample class; relationships without either proof are
`unknown`.

After the existing opaque-behavior guards, implement finite-value containment
as follows:

- a source `never` is contained by every target;
- a target `unknown` contains every source;
- a source `unknown` is breaking against a narrower target;
- a literal is checked against every native target constraint;
- every source enum member must be accepted by the target;
- enum and literal members are expanded as finite singleton choices during
  union comparison;
- a non-finite source that might only be covered collectively by multiple
  target union choices remains `unknown` unless a stronger proof exists.

The literal evaluator must match SafeShape runtime semantics for Unicode code
point length, ECMAScript Unicode patterns, built-in string formats, finite
numeric ranges, integer constraints, and exact decimal `multipleOf`.

Keep the existing `enum.values.changed` finding code. Add
`literal.value.not_accepted` when a literal is rejected by a different native
target kind. Same-kind literal changes retain `literal.value.changed`.

## Compatibility

No function signatures or snapshot formats change. Changed enum sets can now
move from `unknown` to proven `safe` or `breaking`. A previously unsound literal
comparison can move from `safe` to `breaking`. Conservative union relationships
can move from `breaking` to `unknown` when separate target branches might
collectively cover a non-finite source.

## Alternatives

- Treat enum changes as structural diffs. Rejected because finite-set
  containment is exact and direction-aware.
- Accept a source when every target constraint cannot be disproven. Rejected
  because absence of a counterexample is not a containment proof.
- Enumerate or sample primitive values. Rejected because heuristics cannot
  justify a public `safe` result.
