# SafeShape 3.1 Release Quality Contract

Status: automated qualification and all local constituent release gates passed; independent walkthrough and final versioned CI remain open.

Last updated: 2026-09-10

## Implementation Evidence

- Q0: pinned `quality/package-lock.json`, reference Node in `quality/.node-version`,
  paired scenario definitions and raw source-identified reports are implemented.
- Q1: seeded nested grammar and prototype-key tests pass; they exposed and now
  guard the equal-literal graph correction in RFC 0043. Prototype-sensitive
  contract additions exposed false safety, corrected across core/compat/export
  under RFC 0044 with explicit affected-baseline migration notes. Existing core tests cover
  warning/async ordering, rejected branch warnings, frozen results, and rejection
  containment.
- Q2: dedicated inference fixtures and installed declarations pass on TypeScript
  5.9.2 and 7.0.2. Paired 5/100-field and depth-20 compiler fixtures run five
  times. Browser bundles and local Node 20.10.0 are verified; Node 24 is configured
  in CI but its remote result has not been observed in this session.
- Q3: matched baseline, isolated parser/resource/compiler samples, bundle sizes,
  contract-operation samples, and the 50-check CI budget are automated. The final
  local quality run passed; raw evidence is recorded separately.
- Q4: independently installed form/server/CI fixtures pass. The actual resolver
  runs in a browser-targeted VM bundle and the form was also exercised in Chrome
  through Playwright. The independent human walkthrough is still open.
- Q5: final versioning, exact-candidate remote CI, and release approval are open.

The checklists below remain acceptance criteria. Passing automation must not
be used to mark the remaining external checks complete. See
[release evidence](release-evidence-3.1.md) for completed runs and limits.

## Meaning of the Quality Target

The final goal is to build the best runtime contract platform for TypeScript.
The product must help teams define, validate, describe, compare, and safely
evolve contracts. Ordinary validation must be dependable, but Zod replacement,
API parity, and winning every validation microbenchmark are not the mission. A passing internal test suite is
necessary but does not establish quality parity with Zod. The release must
satisfy the gates below before versioning and publication preparation.

Zod's official documentation treats runtime speed, compiler cost, and bundle
size as separate concerns: [Zod 4](https://zod.dev/v4),
[package choices](https://zod.dev/packages/zod), and
[compiled validation](https://zod.dev/compile). These are evaluation dimensions,
not benchmark results for SafeShape. No feature-count parity is required.

## Primary Product Acceptance

These requirements take precedence over comparative benchmark goals:

- A runtime contract preserves strong input/output inference and immutable,
  ordered diagnostics through parsing and supported boundaries.
- Equivalent contract artifacts are deterministic; reviewed baselines survive
  checks byte-for-byte.
- Direction and graph side are explicit. A `safe` decision has a supported
  proof, and opaque or unsupported cases disclose the limits of that proof.
- A team can identify the changed path, affected producer/consumer role,
  migration or review decision, and next action from the report.
- One project check evaluates the declared contract list, preserves results
  after per-entry failures, and yields reliable CI exit behavior.
- Existing public contracts remain compatible unless an approved RFC explicitly
  defines a change.

Release evidence must map each requirement to runtime, type, artifact, CLI, and
consumer tests where applicable. No Zod comparison can substitute for these
SafeShape-specific requirements.

## Q0 — Reproducible Comparison Definition

- [x] Pin one stable Zod release, TypeScript, bundler, Node, and all integration
  dependencies by exact versions in an isolated quality fixture lockfile.
- [x] Record the SafeShape commit plus working-tree patch identity, machine,
  commands, inputs, raw results, and fixture versions.
- [x] Define a paired scenario matrix before measuring: primitive constraints,
  strict nested API objects, optional/nullable properties, arrays, tagged and
  ordinary unions, records, recursion, transforms, and async rules.
- [x] Align unknown-property policies, accepted values, outputs, and failure
  collection. Mark intentional semantic differences explicitly. Zod is a
  comparison implementation, not the authority on SafeShape correctness.

Compare ordinary parsing with ordinary parsing. Report compiled Zod and Zod
Mini separately if evaluated; never silently mix execution or package profiles.
Keep comparison dependencies outside published runtime packages.

Exit: another developer can reproduce every comparison from pinned fixtures.

## Q1 — Runtime and Compatibility Correctness

- [x] Extend deterministic generated tests over interacting schema kinds,
  constraints, nesting, all compatibility modes, and both graph sides.
- [x] Independently verify accepted/rejected values and produced outputs;
  equal acceptance alone does not establish transformation compatibility.
- [x] Cover diagnostic ordering, complete paths, frozen results, rejected async
  callbacks, rejected union-branch warnings, and opaque semantic identities.
- [x] Include prototype-sensitive keys, malformed/tampered snapshots, invalid
  manifests, and adversarial finite-depth inputs relevant to supported behavior.
- [x] Save seeds and minimized fixtures for every discovered failure; add a
  regression test before fixing the corresponding implementation.

Exit: zero unresolved false-safe witnesses, incorrect parse results, mutation
violations, or diagnostic loss in the defined domain. Document tested depth and
size limits. Unsupported behavior stays explicit; unknown never becomes safe
merely to increase coverage. No unhandled rejection is acceptable in supported
async paths. Bounded testing is not a universal proof.

## Q2 — TypeScript and Package Contracts

- [x] Add dedicated positive and negative compile fixtures for input/output
  inference, transforms, optionality, recursion, composition, and async results.
- [x] Reject invalid assignments without casts; detect unintended `any` and
  loss of known fields. Test strict mode and `exactOptionalPropertyTypes`.
- [x] Run published declaration consumers with the oldest explicitly supported
  TypeScript version and the pinned comparison version; state the supported
  range only after evidence exists.
- [x] Compile small, 100-field, and deeply composed paired schema fixtures with
  `tsc --extendedDiagnostics`; record time, memory, and instantiation counts.
- [ ] Verify installed ESM exports, the minimum declared Node version, the CI
  Node version, and browser bundling of browser-targeted packages. Node-only
  tooling must not enter the core browser import graph.

Exit: every type fixture compiles or fails exactly as specified; no unexpected
`any`, excessive-instantiation error, unresolved export, or environment failure.
Do not imply CJS, browser CLI, or other untested runtime support.

## Q3 — Performance and Resource Budgets

Measure schema construction, cold import/first parse, warm valid and invalid
parsing, and async overhead separately. Consume and validate results. Keep
snapshot/compatibility work separate from the shared validation comparison.

- [x] Run at least five isolated processes per library and scenario using the
  same runner, machine, runtime, warmup, and iteration policy. Record every run,
  medians, spread, and outliers; interleave execution order.
- [x] Measure steady-state heap for equal retained schema populations and
  minified/gzipped production browser bundles for equivalent consumer imports.
- [x] Establish the new SafeShape baseline with the outcome-checking runner.
  Do not compare it directly with older unchecked timings.

Release budgets are based on SafeShape's own supported product scenarios.
Before collecting candidate results, pin representative fixtures and the matched
3.0 baseline using the same outcome-checking runner. For existing functionality,
a median latency, compiler check-time, or bundle-size regression above 20%, or
retained-schema heap growth above 25%, blocks release until fixed or explicitly
reviewed as an intentional product tradeoff with evidence. These initial budgets
are project policy, not proof of user-perceived performance. Define absolute
budgets for the new project-check workflow from its declared fixture sizes and
CI use case before evaluating candidate timings; do not invent an SLA from a
single smoke run.

Zod measurements are an external quality reference for shared scenarios.
Investigate material gaps and explain their cause, but do not make a universal
SafeShape/Zod ratio the release criterion. A difference caused by extra contract
semantics must remain visible rather than hidden in a misleading comparison.
Fix costs that hurt the intended workflow; do not remove diagnostics, weaken
proofs, or redesign the platform merely to win a microbenchmark. Instantiation
counts are diagnostic evidence, not an independent quality score.

Exit: all declared SafeShape scenario budgets are met or explicitly reviewed;
no unexplained material regression remains. Publish comparative results with
scope and limitations. Noisy or inconclusive results remain pending. Do not
hide slow cases inside an overall average or claim general Zod parity from a
subset of passing measurements.

## Q4 — Consumer Integration and Developer Experience

- [x] Build three independently installed fixtures: browser form validation,
  server request/response validation, and a multi-contract CI project.
- [x] Use at least one real external Standard Schema consumer with pinned
  dependencies. Structural protocol conformance alone does not establish
  integration quality. Keep adapters out of core.
- [x] Cover happy path, nested errors, warnings, async errors, and the documented
  limitations of third-party consumers that ignore warnings.
- [x] Exercise safe, breaking, unknown, and operational-error batch checks;
  retain failed reports and verify baseline bytes remain unchanged.
- [ ] Have a developer outside the implementation review reproduce the
  quick-start and a contract change from documentation, recording blockers,
  required casts, undocumented setup, and unclear migration advice.

Exit: all three fixtures work from installed archives without undocumented
workarounds; the independent walkthrough has no unresolved blocker. External
production adoption is separate evidence and must not be invented from smoke
fixtures. An agent cannot mark a human walkthrough complete on its own.

## Q5 — Release Candidate Review

- [ ] Review public behavior against RFCs, declarations, documentation, and
  previous-version fixtures. Preserve existing snapshots and machine output.
- [ ] Complete final versioned release checks and verify the configured CI
  result for the exact candidate, including pack/install and registry audit.
- [ ] Record remaining known limitations, upgrade instructions, and all gate
  evidence in the release report. Resolve every mandatory open gate.

The release readiness statement must say which scenarios and versions were
verified. Passing these gates supports a scoped engineering-quality claim;
it does not prove equivalent ecosystem size, popularity, or production history.

## Implementation Order

1. Pin comparison fixtures and write the scenario/evidence matrix (Q0).
2. Add generated correctness and type-level coverage, then fix findings (Q1/Q2).
3. Measure matched performance and bundle/resource costs, then fix misses (Q3).
4. Complete installed integrations and independent documentation walkthrough (Q4).
5. Review, version, and run final candidate checks (Q5 and release roadmap R1–R4).

The existing `check-many` feature is implemented. These quality gates remain
release-blocking work; feature completeness must not be labeled release readiness.
