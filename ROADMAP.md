# Roadmap

Current release: **3.0.0**. Next target: **3.1.0 — Trusted Contract Evolution**.

The user authorized release on 2026-09-11, superseding the previous publication
hold. The unpublished 3.2 working scope is included in the
[3.1.0 versioned candidate](docs/release-candidate-3.1.0.md). Stable quality gates
remain mandatory; authorization does not mark them complete.

SafeShape is a runtime contract platform. Zod is a quality benchmark for
validation ergonomics, type inference, performance, and integration, not a
feature checklist or a requirement to copy its API.

The next release strengthens the workflow: change a contract, understand the
impact on producers and consumers, and review the migration in CI.

The selected implementation is complete: multi-contract checking, aggregate
reports, compatibility evidence, consumer examples, and benchmark outcome checks.
Release readiness additionally requires the [quality contract](docs/release-quality-3.1.md):
contract-evolution correctness, type inference, SafeShape workflow budgets, installed
integrations, and an independent documentation walkthrough. These gates precede
final review, versioning, candidate verification, and approved publication.

See the [3.1 release roadmap](docs/roadmap-3.1.md) for the remaining checklist,
the [current roadmap](docs/roadmap.md) for context, and the
[implementation plan](docs/implementation-plan-3.1.md) for technical scope.

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
