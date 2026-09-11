# RFC 0045: Bounded contract counterexamples

## Status

Accepted.

The initial string domain below is extended by [RFC 0046](0046-string-length-counterexamples.md).

## Capability

Add `createContractCounterexamples(previous, next, options?)` to compat for
same-format v1 or v2 snapshots. Options are compatibility (default backward)
and side (default input; output is unavailable in this first domain).
Return a frozen array with one result per requested direction, backward first
for full. Each result identifies direction, side, source (`previous` or `next`),
target, and root path `[]`. An available result has `value`, a JSON scalar.
An unavailable result has a reason: `unsupported-side`, `unsupported-domain`,
`candidate-limit`, or `no-witness-found`.

The source is previous for backward and next for forward. A witness is a full
root value accepted by source and rejected by target, never a local fragment.
Results supplement existing compatibility/migration reports without changing
their proof, finding codes, fingerprints, or CLI exit codes.

## Initial domain and limits

Support roots with no refinements: JSON scalar literals (excluding negative
zero), enum, boolean, number with native constraints, unconstrained string,
unknown and never. Other nodes and special encoded literals are unavailable.
Candidates are finite literal/enum values, booleans, null, empty string, zero,
plus/minus one, and finite numeric bounds with adjacent representable numbers
and rounded integers. Candidates from both roots are checked deterministically.
At most 128 candidates are validated per direction. Reaching the limit without
a witness reports `candidate-limit`, not compatibility. This is bounded search,
not exhaustive synthesis even for supported numeric constraints.

Reconstruct only supported scalar validators from validated snapshots using
core primitives. Never execute schema callbacks or treat an output acceptance
test as proof of production. Validate public snapshot inputs with existing
snapshot parsers; mixed formats and invalid options throw. No snapshot-only
API can verify opaque callback behavior.

## CLI and evidence

`contract check` and `contract check-many` gain the boolean `--counterexamples`
flag. Opt-in reports add `counterexamples`; default JSON remains unchanged.
Text output includes the same directional examples or unavailable reasons.
Manifest format remains unchanged. No baseline writes are introduced.

Tests independently execute original runtime schemas on returned values,
exercise both formats/directions, limits, unsupported domains, immutability,
determinism and CLI opt-in behavior. Installed-consumer examples compose the
results with existing migration and HTTP presentations.
