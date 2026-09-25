# SafeShape 3.2.0: composable and connected runtime contracts

Completed and published on 2026-09-25. See the
[release record](release-candidate-3.2.0.md) for verification and the explicit
owner-approved exception to the independent human walkthrough gate.
The implementation and qualification history follows.
Baseline: published 3.1.0. See [RFC 0048](../rfc/0048-composable-runtime-contracts.md)
and [ADR 0035](../adr/0035-composition-and-connection-boundaries.md).

## File/edit order and acceptance

1. Core schema implementation and exports; runtime and inference tests for
   composition and checked pipelines, including async, warnings and immutability.
2. TypeScript graph renderer and CLI side selection; compile generated recursive
   declarations and preserve existing acyclic output fixtures.
3. Compat tagged/tuple witnesses and explicit output-to-input connection analysis;
   independent original-runtime witness tests and conservative opaque cases.
4. CLI connection manifests with deterministic reports, exit semantics and
   read-only baseline handling; installed consumer checks.
5. Restricted Zod source migration tool, migration guide and runnable form/server/
   connection journeys; precise unsupported cases and semantic differences.
6. API documentation, EN/RU navigation and current roadmap; qualification with
   narrow tests followed by the full release gate and recorded comparative data.

Versions are synchronized to the 3.2.0 candidate after functional validation.
No tag or publication is part of implementation. Full stable
qualification also requires an external developer walkthrough; automated fixtures
must not be presented as human or production adoption evidence.

## Predeclared new-operation budgets

Before measurements: 1,000 connection checks in 5 seconds and 10,000 pipeline
parses in 5 seconds in the benchmark runner. Quality adds five alternating
SafeShape/Zod samples for composition and pipelines, with 20,000 valid and
20,000 invalid parses per sample and a 5-second median budget per workload.
Existing latency/compiler/bundle (20%) and heap (25%) budgets remain unchanged
against the published 3.1.0 baseline.

## Completed local qualification

All six implementation steps above are complete. The 3.2.0 candidate passed
`prepare:release` and produced eight archives matching installed consumers. See
[the evidence](release-evidence-3.2.0.md) for 268 package tests, three migration
tests, audits, comparative measurements and pending CI/human walkthrough.

## Authorized production and diagnostics polish

The user approved boundary error materialization, complete connection text
reports, combination/witness tests and separate issue/formatting measurements.
[ADR 0036](../adr/0036-boundary-error-materialization.md) preserves public Error
behavior and explicit application policy. Production fixtures reject invalid
operations, log through an isolated application sink and handle the next request;
no global non-throwing mode or silently trusted invalid data is introduced.

The polish passed the full `prepare:release` gate and all eight archive hashes
match installed consumers. See [current evidence](release-polish-3.2.0.md) for
274 package tests, production checks and comparative diagnostics measurements.
Final CI passed on Node 20.10.0 and Node 24. The independent human walkthrough
remained incomplete and was explicitly excepted by the owner for publication.
