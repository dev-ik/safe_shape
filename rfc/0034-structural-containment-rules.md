# RFC 0034: structural containment for tuples, unions, and object policies

## Status

Accepted for the second M5 compatibility-rule slice.

## Motivation

The v1 compatibility engine compared tuples only with tuples, treated
array/tuple changes as unknown kind changes, and could not distinguish an
uncovered union branch from possible collective coverage. Object shape changes
under `strip` and `passthrough` also remained unknown even when input
containment or parsed-output divergence was directly provable.

## Proposal

Extend proof-oriented compatibility analysis without changing snapshots or
public function signatures.

Tuple and array rules:

- compare equal-length tuples positionally;
- a tuple is contained by an array when its fixed length is inside the array
  interval and every tuple item is contained by the homogeneous item schema;
- an array is contained by a tuple when its effective accepted length is the
  tuple length and its item schema is contained by every tuple position;
- an array whose item contract is provably empty accepts only `[]` when zero is
  allowed, or is itself empty when a positive minimum is required;
- report a length `breaking` only when an accepted counterexample length is
  constructible; otherwise return `unknown`.

Union rules:

- retain the per-source-choice subset proof;
- keep possible collective coverage of a non-finite source as `unknown`;
- report `breaking` when an inhabited source choice is provably disjoint from
  every target choice;
- derive disjointness from exact literals or non-overlapping runtime value
  families, not sampling.

Object rules retain the existing policy matrix and complete shape cases:

- adding an optional property to a rejecting source is safe;
- adding a declared property to a stripping source is breaking because the
  parsed output starts emitting it, or because the target rejects a value the
  source accepted and stripped;
- adding an optional property to a passthrough source is safe only for a
  universal identity property, breaking for a provably narrower property, and
  unknown for opaque behavior;
- removing a property into `passthrough` is safe when the old property parser
  is provably value-preserving, and unknown for transforms or other
  output-changing behavior;
- removal into `reject` or `strip` remains breaking.

Add the stable `tuple.array.changed` finding code for cross-kind length
relationships and `contract.target.empty` when a target is provably empty.
Existing object and union finding codes remain unchanged.

## Compatibility

No snapshot format or API signature changes. Some conservative reports become
proven `safe` or `breaking`. Union reports that have an explicit disjoint value
family can move from `unknown` to `breaking`. These are intentional M5 policy
completions for the 2.0 release.

## Alternatives

- Compare only equal schema kinds. Rejected because tuple/array containment is
  structurally decidable for exact lengths.
- Treat every failed union branch match as breaking. Rejected because several
  target branches can collectively cover one non-finite source.
- Ignore parsed output in object-policy changes. Rejected because `strip` and
  `passthrough` intentionally have different runtime contracts.
