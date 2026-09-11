# RFC 0046: Bounded string-length counterexamples

## Status

Accepted.

## Decision

Extend RFC 0045's scalar domain to native string `minLength` and `maxLength`.
Reconstruct validators through core so length follows runtime Unicode code-point
semantics. Strings with pattern, format, or refinements remain unsupported.
No output-side synthesis or composite construction is added.

Generate two ASCII representatives (`a` and `b` repetitions) for lengths zero,
one, and each declared bound with its immediately adjacent nonnegative integer
lengths. Use the source root then target root, preserving deterministic order.
The two representatives avoid assuming that one accepted string represents all
strings when the other contract is a literal or enum. Search remains bounded,
not exhaustive for arbitrary finite excluded sets.

Never allocate a synthesized string longer than 1,024 code points. Bounds beyond
that limit are skipped before allocation. If no witness is found and lengths
were skipped, return the new unavailable reason `construction-limit`. A found
witness takes precedence; the existing 128-validation `candidate-limit` takes
precedence when that limit is reached. Literal and enum values are supplied by
the snapshot and retain their existing semantics; the synthesis bound does not
limit their length or snapshot parsing cost.

## Compatibility and verification

Existing reports, snapshot bytes, and CLI exit codes are unchanged. This extends
the unpublished counterexample result union with `construction-limit`; consumers
using exhaustive switches must handle the new reason. Default CLI reports stay
unchanged; opt-in results can now find witnesses for previously unsupported
length-constrained roots.

Test both formats and directions against original runtime schemas, including
astral characters, combining sequences, empty strings, equal and disjoint
length ranges, large bounds, and unsupported patterns/formats. Exercise CLI and
installed consumers. Set a separate string fixture budget before measurement:
10,000 searches within 5 seconds including snapshot parsing and assertions.
