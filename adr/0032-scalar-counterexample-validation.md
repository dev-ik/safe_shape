# ADR 0032: Validate bounded scalar counterexamples in compat

## Status

Accepted.

Counterexample generation belongs in compat alongside snapshot analysis. Core
remains unaware of tooling. A separate internal module reconstructs only the
explicit scalar whitelist with core validators, avoiding a second implementation
of numeric constraint semantics. Snapshot parsers remain the trust boundary.

Generated candidates are synthetic and bounded. No application payloads or
callbacks are evaluated. This keeps execution deterministic and prevents an
unavailable example from changing an existing compatibility judgment. Complex
roots and output production require separate future evidence and are rejected
as unsupported rather than approximated.
