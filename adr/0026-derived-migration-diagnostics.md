# ADR 0026: derive migration diagnostics in compat

## Status

Accepted.

## Context

CLI, CI integrations, and future API tooling need the same decision and
actionable migration summary. Reimplementing aggregation in each presenter can
produce inconsistent classifications. The proof engine already owns stable
statuses, rule codes, paths, and suggestions.

The CLI also needs to select v1 or v2 comparison without weakening snapshot
validation or changing the default artifact format.

## Decision

`@safe-shape/compat` owns the pure immutable
`createMigrationDiagnostics()` projection. It derives decisions only from an
existing report and never upgrades an unknown result to safe.

The CLI consumes that projection verbatim. It detects a parsed snapshot's
explicit format, creates the matching current snapshot, and delegates to the
corresponding comparison API. V1 remains the default snapshot writer; v2 is an
explicit flag. Graph side selection applies only to v2.

CI examples treat the CLI exit code as the gate and retain JSON output as the
review artifact. They never update baselines automatically.

## Consequences

- Programmatic and CLI migration decisions stay identical.
- CI receives compact actionable diagnostics without losing the full report.
- Recursive contracts enter the standard CLI workflow without rewriting v1
  baselines.
- Baseline approval remains an explicit repository decision.
