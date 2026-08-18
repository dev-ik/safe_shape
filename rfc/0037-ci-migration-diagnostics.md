# RFC 0037: CI migration diagnostics and graph contract checks

## Status

Accepted for the final compatibility-tooling slice of SafeShape 2.0.

## Motivation

Compatibility findings contain proof detail and suggestions, but CI consumers
still need to derive whether a migration is required or whether an unproven
change needs manual review. The CLI also writes only v1 snapshots, leaving
recursive v2 contracts outside the standard CI workflow.

The final M5 slice must provide a stable, vendor-neutral result without
changing existing v1 baselines or exit codes.

## Proposal

Add `createMigrationDiagnostics(report)` to `@safe-shape/compat`. It returns an
immutable JSON-friendly object with:

- `decision`: `compatible`, `migration-required`, or `manual-review`;
- explicit `migrationRequired` and `manualReviewRequired` booleans;
- counts for every compatibility status;
- a stable summary;
- actionable diagnostics for `breaking`, `risky`, and `unknown` findings,
  preserving rule code, path, direction, message, and suggestion.

Decision precedence follows the report status. A proven breaking change
requires migration. An unproven risky or unknown change requires manual review.
Safe and annotation-only results require neither.

`safe-shape contract check` adds this object to its JSON payload and uses the
same summary and suggestions in human-readable failures. Existing report fields
and exit codes remain unchanged.

## Versioned CLI Graph Workflow

Add opt-in CLI flags:

```sh
safe-shape contract snapshot --format v2 ...
safe-shape contract check --against ./contract.json --side input ...
```

Snapshot format defaults to `v1`. Contract check detects the stored snapshot
format and creates the matching runtime snapshot. V2 checks select `input` by
default or accept explicit `input`/`output`. Supplying `--side` for a v1
baseline is an operational error because v1 has no independent graph sides.

Malformed, mismatched-fingerprint, or unsupported snapshots remain operational
errors. `breaking`, `risky`, and `unknown` remain normal command results with
exit code 2.

## CI Examples

Document a vendor-neutral shell workflow plus GitHub Actions and GitLab CI
examples. The repository itself runs the complete release gate on pushes and
pull requests. Runnable examples verify snapshot creation, compatibility exit
behavior, and the migration payload.

## Compatibility

- V1 remains the CLI default and its artifact bytes do not change.
- Existing JSON report fields remain present; `migration` and `format` are
  additive.
- Existing exit codes remain unchanged.
- V2 format and side selection are explicit and machine-readable.

## Non-Goals

- Automatically editing schemas or stored baselines.
- Approving unknown or risky changes.
- Uploading artifacts to a particular CI vendor.
- Replacing project review of baseline changes.
