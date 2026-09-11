# SafeShape 3.1 Implementation Plan

Status: automated qualification and local gates passed; graph-literal and prototype-key fixes included; independent walkthrough and final versioned CI pending

Last updated: 2026-09-10

Progress and measurements: [release evidence](release-evidence-3.1.md).
Remaining release work: [3.1 release roadmap](roadmap-3.1.md).

Required next work: [quality contract Q0–Q5](release-quality-3.1.md). Prior
passing checks do not satisfy this expanded qualification automatically.

## Added Scope: Project Contract Gate

[RFC 0042](../rfc/0042-multi-contract-checks.md) and
[ADR 0030](../adr/0030-sequential-cli-contract-batches.md) specify the additive
`contract check-many` command, versioned manifest, sequential evaluation,
aggregate JSON/text reports, and operational-error precedence. Benchmark
outcomes are now checked during warmup and measurement, with runner regression
tests. This public CLI addition supports the original 3.1 minor-release target.

## Outcome

A team can change a contract, run the existing CLI against a reviewed baseline,
identify the affected producer or consumer, and decide whether migration or
manual review is required without interpreting compatibility internals.

Zod is a benchmark for engineering quality and everyday validation usability.
SafeShape's release scope is driven by contract evolution, not API imitation.
No performance, ecosystem, or reliability parity is claimed without evidence.

## Existing Foundation

Already shipped in 3.0 or earlier:

- v1 and v2 snapshots with deterministic fingerprints;
- directional compatibility analysis, including recursive graphs;
- input/output comparison and conservative handling of opaque behavior;
- migration diagnostics and HTTP producer/consumer presentation;
- CLI checks and provider-neutral CI documentation;
- warnings, structured diagnostics, and explicit async parsing.

Use the [compatibility matrix](compatibility-matrix.md),
[compat API](api/compat.md), and [CI guide](ci.md) as the baseline. Work starts
by mapping existing tests to requirements; add coverage only for actual gaps.

## M0 — Scenario and Evidence Inventory

Create a scenario ledger covering required-property changes, enum widening and
narrowing, native constraints, object policies, unions, recursion, transforms,
and stable versus changed opaque rule identities. Include warning and async
rules introduced in 3.0.

For every scenario record:

- previous and next schema, snapshot format, selected side, and direction;
- request/response roles where applicable;
- expected relationship, existing test location, and missing evidence;
- expected migration decision and user action.

Keep accepted-value containment separate from output transformation behavior.
Stable opaque ids are user assertions, not proofs of callback equivalence.

Exit: each scenario maps to an existing test or a concrete coverage task;
confirmed defects are distinguished from unimplemented capabilities.

## M1 — Compatibility Soundness

Extend the compat tests with independent runtime witnesses and bounded,
deterministic enumeration for tractable schema domains. For backward checks,
look for values accepted by the previous contract and rejected by the next;
reverse the relationship for forward checks and test both for full checks.

For output-side checks use produced values from representable contracts and
explicit expected-output assertions where policies or transformations matter.
Do not treat acceptance-only tests as proof of output preservation.

Cover recursive graphs with concrete finite-depth witnesses, v1/v2 agreement
where both formats represent the same semantics, and conservative outcomes for
unprovable relationships. Preserve snapshot bytes, finding codes, and public
semantics except for documented correctness fixes.

Exit: no contradictory `safe` result in the recorded test domain; every new
defect has a regression test. Bounded tests are evidence, not a universal proof.
Changes to public capability or semantics require an RFC before implementation.

## M2 — Migration Explanations

Exercise `createMigrationDiagnostics()` together with
`createHttpCompatibilityPresentation()` on the scenario ledger. Each actionable
case must make the changed path, direction, affected role, reason, and next
action understandable. Distinguish proven breakage from missing proof.

First improve examples and documented composition of existing APIs. If a
scenario requires new report fields or CLI options, specify them in an RFC;
do not silently change JSON envelopes, finding codes, or exit behavior. Any
architectural change requires an ADR.

Exit: tested examples explain request and response changes in both directions,
including `manual-review`; guidance never claims to discover actual deployed
consumers or generate a migration automatically.

## M3 — Reproducible CI Journey

Add a runnable contract-evolution example and integrate it with the existing
example checker. Demonstrate a safe change, a breaking change, an unknown
relationship, and an operational error. Assert CLI exit codes 0, 2, 2, and 1
respectively, as well as the applicable JSON decisions and output streams.

Include v2 input/output checks and a recursive contract. Show the explicit
review step before replacing a baseline; checking must never regenerate it.
Verify that stored snapshots are unchanged after checks. Extend consumer
tarball coverage for gaps identified in this journey.

Exit: a fresh consumer installation can reproduce the documented workflow;
CI retains reports on failure and preserves reviewed baselines.

## M4 — Quality and Release Evidence

Measure snapshot creation, graph comparison, migration projection, and valid
and invalid parsing using existing benchmark infrastructure. Record environment,
fixture size, commands, and a 3.0 baseline before interpreting changes. Set
regression budgets from that baseline before accepting performance changes.

A Zod comparison is optional evidence for equivalent validation scenarios,
with exact versions and matching semantics. It is not a benchmark for
SafeShape-specific compatibility analysis and is not a dependency of core.

Run focused package checks during implementation, then the existing complete
gate with `npm run release:check`. Prepare archives with
`npm run prepare:release` when ready. Record failures or unavailable checks
explicitly; publishing follows the [release workflow](release.md).

Exit: documented public changes have RFCs, tests, examples, and consumer
coverage; the complete gate passes and release archives are reviewable.
Publication requires separate explicit release approval.

## File Edit Order

1. Add `docs/release-evidence-3.1.md` for the scenario ledger and measured results.
2. Add RFCs and ADRs only for identified public or architectural changes.
3. Extend `packages/compat/tests/compat.test.ts`; make focused fixes in
   `packages/compat/src/index.ts` when evidence requires them.
4. Extend CLI tests and change `packages/cli/src/cli.ts` only for proven gaps
   or specified additions.
5. Add the runnable example under `examples/`; update
   `scripts/examples-check.mjs` and `scripts/consumer-check.mjs`.
6. Extend `benchmarks/run.mjs` for missing release scenarios.
7. Update `docs/compatibility-matrix.md`, `docs/api/compat.md`,
   `docs/api/cli.md`, `docs/ci.md`, and relevant EN/RU navigation and examples.
8. Update release evidence and roadmap; change workspace versions and lockfile
   only when the final release scope and semver classification are established.

## Non-Goals and Risks

- No new snapshot format, automatic baseline acceptance, or migration rewriting.
- No framework dependency in core, broad Zod API parity, OpenAPI project,
  concurrent async execution, or speculative parser rewrite.
- Recursive TypeScript generation remains a separate candidate.
- Existing `unknown` results are not defects merely because a stronger proof
  would be convenient. False safety is more costly than incomplete coverage.
- Human-readable improvements must not obscure stable machine-readable data.
- External adoption and user feedback remain unverified until real consumers
  provide evidence; a passing release gate does not establish market parity.
