# Roadmap

Current published release: **3.1.0**, verified in the
[release record](docs/release-candidate-3.1.0.md). The old 3.2 working scope was
incorporated into 3.1.0; historical roadmaps do not describe a pending publication.

The next development release focuses on composable runtime contracts, checked
pipelines, recursive TypeScript artifacts, explicit producer/consumer connections
and a verified adoption journey from Zod. Runtime first, immutable schemas, explicit
conversion and API stability remain mandatory.

See [the implementation plan](docs/implementation-plan-next.md),
[RFC 0048](rfc/0048-composable-runtime-contracts.md), and
[ADR 0035](adr/0035-composition-and-connection-boundaries.md). The additive candidate version is 3.2.0;
publication follows separate release authorization and final qualification.

## v1.0.0 Stable API

Included in the first stable release:

- Core runtime schemas.
- Parser APIs and immutable parse results.
- Rich diagnostics.
- Core schema extensions.
- HTTP boundary helpers.
- JSON Schema export.
- CLI schema export, validation, and type generation.
- Programmatic TypeScript declaration generation.
- Programmatic validation reports.
- Schema metadata annotations.
- Umbrella `safe-shape` package.
- Benchmark smoke suite for release evidence.
