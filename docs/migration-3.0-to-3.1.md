# Updating from SafeShape 3.0 to the 3.1 Candidate

3.1 is not published yet. These notes describe the current candidate.

Existing single-contract commands and ordinary snapshot formats remain in place.
`contract check-many --manifest` is an opt-in project workflow; see the CLI
reference for per-entry errors in stdout versus manifest failures in stderr.

Two compatibility correctness fixes can change results:

- RFC 0043: equal literal leaves within equivalent v2 unions/wrappers no longer
  report false breaking changes. Opaque behavior guards remain conservative.
- RFC 0044: own `__proto__` fields and lazy ids are preserved in descriptions,
  snapshots, and JSON Schema. They previously could disappear and cause false
  safety. Snapshot required-property lists cannot refer only to inherited keys.

If a baseline uses prototype-sensitive fields or ids, compare it with the runtime
schema and inspect its own properties. Malformed affected baselines may now be
rejected; corrected artifacts may have different fingerprints. Recreate them
only after reviewing the schema and producer/consumer implications. Do not
regenerate all baselines or suppress a failed gate to accept the change.

Ordinary contracts retain their snapshot representation. The release's generated
witnesses and consumer examples provide evidence for the tested domain, not a
proof for arbitrary application callbacks.
