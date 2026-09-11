# SafeShape 3.1 — Trusted Contract Evolution

Status: selected features and automated quality qualification implemented; final evidence and independent walkthrough pending.

Last updated: 2026-09-10

The publication hold of 2026-09-10 was superseded by release authorization on
2026-09-11. The [3.1.0 candidate](release-candidate-3.1.0.md) includes the subsequent
unpublished 3.2 working scope. Independent walkthrough and candidate verification
remain required; approval does not mark them complete.

Current candidate package version: 3.1.0. Previous published version: 3.0.0.
The new CLI capability is additive, so this is a minor release. Nothing in this
roadmap marks 3.1 as published or authorizes publication.

## Product Outcome

Final goal: build the best runtime contract platform for TypeScript.

For 3.1, a team checks its reviewed contracts with one command, sees which changes
require migration or manual review, and understands the relevant HTTP roles.
The workflow preserves existing baselines and conservative compatibility proofs.

Zod remains a benchmark for quality and usability. SafeShape's differentiator
is runtime contract evolution: snapshots, directional compatibility, migration
explanations, and CI checks. Full Zod API parity is not a release requirement.

## Selected Scope

| Deliverable | Status | Acceptance evidence |
| --- | --- | --- |
| `contract check-many --manifest` | Implemented | Explicit versioned manifest; manifest-relative paths; ordered results; per-entry errors; exit precedence 1 → 2 → 0 |
| Aggregate JSON and text reports | Implemented | Original findings and migration diagnostics retained; optional HTTP producer/consumer roles |
| Compatibility soundness coverage | Implemented | Bounded runtime witnesses, v1/v2 comparisons, finite-depth recursion, output assertions, warning/async identities |
| Reproducible consumer workflow | Implemented | Same example runs in workspace and tarball install; safe, breaking, unknown, and operational errors; unchanged baselines |
| Benchmark outcome gate | Implemented | Expected outcomes checked during warmup and measurement; invalid cases remain intentionally invalid |
| Correctness fixes | Implemented | Equivalent graph literals; own prototype-sensitive fields preserved throughout artifacts; affected baseline migration documented |
| RFC, ADR, API and CI documentation | Implemented | RFC 0042, ADR 0030, manifest reference, reviewed-baseline workflow |

Implementation is in the current workspace and has not been released. Detailed
scope is defined by [RFC 0042](../rfc/0042-multi-contract-checks.md),
[ADR 0030](../adr/0030-sequential-cli-contract-batches.md), and the
[implementation plan](implementation-plan-3.1.md).

## Mandatory Quality Qualification Before Release

The [3.1 quality contract](release-quality-3.1.md) is a release requirement,
not optional follow-up. Internal tests passed, but the expanded product-quality requirements have not
been verified. Zod is an external reference; SafeShape-specific correctness and
contract-evolution outcomes determine release readiness. Complete these gates before R1–R4:

| Gate | Required result | Current status |
| --- | --- | --- |
| Q0: pinned comparison | Reproducible Zod/SafeShape scenarios with matched semantics | Implemented; pinned lockfile and source-identified reports |
| Q1: correctness | Generated runtime witnesses, conservative proofs, preserved diagnostics | Seeded grammar and runtime tests pass; graph-literal defect corrected |
| Q2: types/packages | Positive/negative inference fixtures, compiler and supported-runtime matrix | Dedicated and installed type fixtures pass; remote Node matrix pending |
| Q3: performance/resources | SafeShape workflow budgets and explained Zod comparisons | Paired five-process samples and budgets implemented; latest standalone run passed |
| Q4: integrations/DX | Three installed consumer fixtures, real Standard Schema integration, independent walkthrough | Three installed fixtures and real resolver pass; Chrome checked; human walkthrough pending |
| Q5: final review | Exact versioned candidate, compatibility review, full CI/release evidence | Pending |

The initial budgets and measurement rules are specified in the quality contract.
An open mandatory gate blocks final release readiness. Keep the feature scope
focused while fixing defects or bottlenecks exposed by these checks.

## Remaining Release Work, in Order

### R1 — Freeze the 3.1 Contract

- [ ] Review the final diff against RFC 0042 and the documented manifest/report.
- [ ] Confirm existing single-contract commands, snapshot formats, fingerprints,
  finding codes, and default semantics remain compatible.
- [ ] Resolve release-blocking defects discovered during review. Additional
  features become separate candidates instead of expanding this release.

Exit: final implementation and public documentation agree; no known unresolved
correctness or compatibility defect blocks release.

### R2 — Prepare Versioned Release Materials

- [ ] Add 3.1 release notes describing the new command, report/exit semantics,
  benchmark correctness fix, and adoption example.
- [ ] Review the [candidate migration notes](migration-3.0-to-3.1.md), including
  corrected prototype-sensitive baseline artifacts. Existing ordinary
  single-contract workflows need no migration;
  switching to a manifest is opt-in. Distinguish per-entry errors in stdout
  from manifest errors in stderr.
- [ ] Set root and all eight workspace packages to 3.1.0; update exact internal
  dependencies, lockfile, and version-dependent EN/RU status documentation.
- [ ] Review the version diff for consistency before packaging.

Exit: manifests, lockfile, documentation, and release notes consistently describe
3.1.0. Existing 3.0.0 review archives are not used for the new release.

### R3 — Verify the Final Candidate

- [ ] Run `npm run prepare:release` on the final versioned candidate with npm
  registry access for audit.
- [ ] Record build, typecheck, tests, docs, examples, benchmarks, consumer
  installation, audit, and pack results in the release evidence.
- [ ] Confirm all eight archives contain version 3.1.0 and the installed CLI
  exposes `contract check-many`.
- [ ] Check the release workflow result for the final candidate; local success
  is not a substitute for evidence from the configured CI environment.

Exit: all release gates pass for the exact candidate and reviewable 3.1.0
archives exist. Any environmental failure is resolved or explicitly reported;
previous checks are not presented as verification of a new versioned candidate.

### R4 — Publish and Verify

- [ ] Obtain explicit release approval for the reviewed candidate.
- [ ] Commit/tag and run the documented publishing workflow under that approval.
- [ ] Verify package versions, GitHub release artifacts, and installation from
  the published packages; rerun the documented contract-checking journey.
- [ ] Mark 3.1 released and select the next scope from actual integration gaps.

Exit: approved artifacts are published and the consumer journey works from the
registry. Follow the [release workflow](release.md) and
[publish readiness checklist](publish-readiness.md).

## Current Evidence and Limits

All 236 package tests and two benchmark runner tests passed, together with
build, typecheck, docs, examples, benchmarks, and tarball consumer checks.
Sandbox DNS prevented the combined preparation command from completing audit;
separate audit with network access found zero vulnerabilities, and packaging
passed separately. These checks covered the implementation at version 3.0.0.
See [release evidence](release-evidence-3.1.md) for details.

Bounded tests do not prove every possible compatibility relationship. Trusted
schema modules can execute code, print output, or hang; isolation and timeouts
are not part of this release. Benchmark outcome checks change measurement
overhead, so old and new runner timings are not directly comparable. Zod
performance parity and external production adoption have not been established.

## Deferred Candidates After 3.1

These are candidates for prioritization, not committed release promises:

1. Constructible counterexamples for proven breaking changes, with honest
   limits for opaque and recursive cases.
2. Further expansion of generated soundness coverage beyond the mandatory
   3.1 quality domain; initial generation is now required by Q1.
3. A review-oriented export format if real CI consumers need more than the
   existing JSON/text report.
4. Graph-aware recursive TypeScript declarations when required by consumer
   artifact workflows.

New capabilities require their own RFCs and evidence. Automatic baseline
acceptance, migration rewriting, framework dependencies in core, full Zod API
imitation, and speculative parser rewrites remain outside the 3.1 scope.
