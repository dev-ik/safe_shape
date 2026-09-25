# ADR 0035: Composition and connection boundaries

## Status

Accepted.

Core owns immutable object composition and checked pipeline execution. Pipelines
reuse the existing conservative transform/refinement descriptions instead of
changing snapshot formats or claiming callback equivalence. The TypeScript
exporter consumes graph descriptions; compatibility compares explicit snapshot
graph sides in compat. The CLI orchestrates files and reports without adding
framework or compiler dependencies to core. Source migration is optional tooling
using the already installed TypeScript compiler and is never a runtime requirement.

Shape-changing operations reject object-level checks because arbitrary callbacks
cannot be safely projected onto different shapes. Field checks and annotations
are preserved. New methods do not mutate schemas or silently replace fields.

The next-release quality baseline advances to published v3.1.0. Existing
regression budgets and measurement methods remain unchanged; historical 3.0
measurements are not overwritten or used as new-release evidence.
