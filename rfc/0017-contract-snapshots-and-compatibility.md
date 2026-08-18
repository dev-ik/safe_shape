# RFC 0017: contract snapshots and compatibility

## Status

Accepted for the initial 2.0 vertical slice.

## Motivation

SafeShape schemas validate runtime values, but teams also need to know whether a
schema change remains compatible with values accepted by an earlier contract.
The check must be deterministic, reviewable, conservative, and usable in CI.

## Proposal

Add `@safe-shape/compat` with four public capabilities:

- `createContractSnapshot(schema, options)` creates an immutable, JSON-safe
  snapshot with a stable format version and SHA-256 fingerprint;
- `parseContractSnapshot(value)` validates snapshots read from untrusted JSON;
- `compareContractSnapshots(previous, next, options)` compares stored
  snapshots;
- `compareContracts(previous, next, options)` compares runtime schemas without
  requiring callers to create snapshots first.

The initial snapshot format is `safe-shape.contract/v1`. It contains a contract
identifier, a canonical contract tree, and a fingerprint computed from that
tree. Object keys, required-property lists, and metadata keys have stable order.
Metadata examples are excluded so snapshots do not contain sample payloads by
default.

Compatibility modes are:

- `backward`: every value accepted by the previous contract must be accepted by
  the next contract;
- `forward`: every value accepted by the next contract must be accepted by the
  previous contract;
- `full`: both relationships must be proven.

Reports have one of these statuses:

- `safe`;
- `breaking`;
- `risky` (reserved for rules that identify a credible but unproven risk);
- `unknown`;
- `annotation-only`.

Every finding has a stable rule code, contract path, compatibility direction,
previous and next descriptions, an explanation, and an optional remediation.

The first rule set covers the existing public schema kinds: primitives,
literals, arrays, tuples, unions, strict objects, records, nullable and optional
wrappers, transforms, and refinements. The engine must never report `safe` when
it cannot prove the required accepted-value relationship.

Opaque refinements and transforms are represented explicitly. `refine()` and
`transform()` options gain an optional stable `id`. Equal non-empty identifiers
are a user assertion that the opaque behavior has the same contract semantics.
Anonymous opaque behavior produces `unknown` when compatibility depends on it.

## CLI

Add:

```sh
safe-shape contract snapshot \
  --module ./dist/contracts.js \
  --export userSchema \
  --out .safe-shape/user.contract.json

safe-shape contract check \
  --module ./dist/contracts.js \
  --export userSchema \
  --against .safe-shape/user.contract.json \
  --compatibility backward \
  --json
```

`contract check` exits with `0` for `safe` and `annotation-only`, `2` for
`breaking`, `risky`, and `unknown`, and `1` for operational CLI errors.

## Alternatives

- Diff generated JSON Schema. Rejected because exporter output is a target
  artifact and does not preserve every SafeShape runtime semantic.
- Put compatibility logic in core. Rejected because core must remain focused on
  runtime validation and neutral descriptions.
- Treat opaque behavior as unchanged when its visible structure matches.
  Rejected because this can classify an undetectable breaking code change as
  safe.

## Migration

The package, CLI commands, option fields, and schema-description fields are
additive. Existing parsing behavior and existing package imports remain
unchanged.
