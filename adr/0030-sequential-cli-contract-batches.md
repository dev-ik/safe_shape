# ADR 0030: Sequential CLI contract batches

## Status

Accepted.

## Decision

Keep manifest orchestration in the existing CLI package. Reuse the existing
compat comparison and presentation APIs; core gains no tooling dependency.
Validate manifests before importing modules and evaluate entries sequentially
in declaration order. Aggregate operational failures without discarding other
entries. Preserve normal Node ESM caching and do not parallelize user callbacks
or imports. Baseline files remain read-only.

## Consequences

Reports have deterministic entry order and explicit error precedence. A failed
entry does not hide later results. Trusted modules may have side effects or
hang, as in existing CLI loading; process isolation, timeouts, and parallel
execution require a separate design. No new dependency or package is required.
