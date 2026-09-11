# RFC 0044: Preserve prototype-sensitive contract keys

## Status

Accepted as a release-blocking correctness fix for 3.1.

## Problem

Runtime object validation preserves own `__proto__` properties, but assignment
into ordinary description dictionaries invoked the inherited prototype setter.
The field disappeared from Contract IR and v1 snapshots. V2 inherited the lost
field, allowing addition of a required `__proto__` field to report safe even
though the old contract accepts `{}` and the new contract rejects it. Lazy ids
and JSON Schema property/definition dictionaries have the same assignment risk.

## Correction

Use explicit own data-property writes in core descriptions, graph canonical
records, v1 snapshot conversion/parsing, and JSON Schema output. Preserve the
existing ordinary-object prototype and immutable public containers. Compatibility
shape lookups and snapshot required-key validation must use own-property checks.
No new schema API, snapshot format, finding code, or coercion is introduced.

## Compatibility and Migration

Ordinary contracts retain their bytes and fingerprints. Artifacts containing
previously lost `__proto__` fields or lazy ids are corrected and therefore can
change fingerprints. Snapshots that require a key absent from their own shape
are malformed and must be rejected, including legacy artifacts affected by this
bug. Review such baselines against runtime schemas before explicit replacement;
never auto-accept them. This diagnostic correction is necessary to remove false
safety and must be called out in release notes.

## Evidence

The regression uses `{}` as a runtime counterexample for addition of a required
prototype-sensitive field. Cover `__proto__`, `constructor`, and `toString`, v1
and both v2 graph sides, description/snapshot round trips, lazy ids, and JSON
Schema definitions/properties in both dialects. Preserve frozen containers and
verify malformed required-property lists are rejected before fingerprint checks.
