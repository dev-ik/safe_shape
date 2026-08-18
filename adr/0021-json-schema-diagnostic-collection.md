# ADR 0021: collect exporter diagnostics during Contract IR traversal

## Status

Accepted.

## Context

Failing on the first opaque node gives poor tooling feedback, while emitting a
partial schema risks accidental use. A separate preflight traversal would
duplicate the exporter and could drift from dialect-specific artifact paths.

## Decision

The JSON Schema renderer carries an internal diagnostic collector and artifact
path through the same recursive traversal that creates schema nodes. When it
encounters unrepresentable behavior, it records an immutable issue and uses an
internal placeholder solely to continue discovery. If any error exists, the
candidate artifact is discarded and never exposed.

The safe result is the canonical internal boundary. The legacy throwing API,
Standard JSON Schema adapter, and CLI adapt that result for their respective
contracts without reimplementing analysis.

## Consequences

One traversal determines both representability and exact artifact locations.
Callers can inspect all known failures deterministically, while successful
exports remain unchanged and deeply immutable. Future warning diagnostics can
reuse the same collector without weakening error handling.
