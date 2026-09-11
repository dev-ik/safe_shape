# Contract Evolution Release Evidence

Target: 3.1 plan. Contract-evolution checks implemented; package version remains 3.0.0.

## Scenario ledger

All existing coverage below is in `packages/compat/tests/compat.test.ts`.
Backward means previous accepted values are contained in next; forward reverses
that relationship. Full checks both. V2 defaults to input unless stated.

| Previous → next | Format / side / direction | Expected decision and action | Existing test |
| --- | --- | --- | --- |
| `{id}` → `{id, organizationId}` required | v1; backward | migration-required; update producers before requiring field | reports required additions and strict object removals as breaking |
| enum draft → draft/published | v1; backward / forward | compatible / migration-required; upgrade consumers before new variant | compares enum sets by directional finite-value containment |
| string minLength 3 → 1 | v1; backward / forward | compatible / migration-required; widen consumer first | classifies string length widening and narrowing by direction |
| reject → strip → passthrough | v1 and v2; input/output; full | inspect acceptance separately from changed output | covers the complete unknown-property policy matrix |
| union string/number → string | v1; backward | migration-required with number witness | uses witnesses for disjoint union branches and stays conservative for collective coverage |
| recursive node → renamed equivalent node | v2; input; full | compatible; reference spelling is non-semantic | compares recursive v2 contracts across renamed references |
| stable transform → changed transform id | v2; input/output; backward | inspect input independently; output manual-review | selects transform input and output graph compatibility explicitly |
| stable refinement → same / changed id | v1; backward | compatible assertion / manual-review; review callback semantics | blocks anonymous opaque behavior and accepts stable matching ids |
| warning or async rule → same / changed id | v1/v2; input/output; full | compatible assertion / manual-review | new opaque rule identity coverage |

## Closed evidence gaps

- Independent bounded runtime containment checks across schema pairs and modes.
- Finite-depth recursive witnesses and explicit produced-output assertions.
- Composition of HTTP roles and migration decisions in every direction.
- One runnable CLI journey covering safe, breaking, unknown, operational errors,
  both graph sides, and unchanged baseline bytes in workspace and tarball installs.
- Snapshot creation and migration projection benchmark cases.

No runtime defect has been established by this inventory. Existing conservative
`unknown` results are not counted as missing features. Stable opaque ids are
caller assertions and cannot prove arbitrary JavaScript equivalence.

## Verification

The compat suite passes 52 tests, including five new evidence tests. The
bounded suite compares 22 schemas pairwise in all three modes, checks v1/v2
status agreement, and challenges safe reports with 79 runtime values. Recursive
witnesses cover four finite depths. Policy output checks assert produced data
separately from input acceptance. Warning/async identity and HTTP projection
tests cover the remaining ledger gaps.

The shared runner in [examples/check-contract-evolution.mjs](../examples/check-contract-evolution.mjs)
checks six comparisons (three outcomes on each graph side), an operational
failure, immutable baseline bytes, and HTTP/migration composition. It runs in
both the workspace example gate and the installed tarball consumer gate.
Existing CLI unit tests already cover snapshot formats, side selection, native
constraint narrowing, and tampered baselines; the missing journey is tested
through the real CLI rather than duplicated as another unit fixture.

The initial evidence-only slice changed no production API. The subsequent
project-gate slice adds a public CLI capability under RFC 0042 and ADR 0030,
making the combined scope suitable for the planned 3.1 minor release. Version
selection and publication remain separate release steps.

Initial evidence-only verification completed on 2026-09-10:

- Build, metadata/boundary checks (8 packages), docs check, and typecheck passed.
- All 225 package tests passed, including 52 compat tests.
- Examples, benchmarks, and installed tarball consumer checks passed.
- `npm run prepare:release` stopped at audit because sandbox DNS could not
  resolve the npm registry. Re-running `npm audit --json` with network access
  passed with zero vulnerabilities.
- The remaining `npm run pack:check` and `node scripts/pack-release.mjs` steps
  passed separately; eight review archives exist under `release-artifacts/`.
  They retain version 3.0.0 and are not new-version publication candidates.
- `git diff --check` passed. No checks remain skipped. The single combined
  command did not complete successfully, but every constituent gate passed.

No packages were published, tagged, or version-bumped.
Bounded enumeration does not constitute a universal proof. External adoption
and parity with Zod are not measured here.

## Initial 3.0 Runtime Baseline

Measured with `npm run benchmarks:check` on unchanged 3.0 runtime code,
Node v20.10.0, Darwin arm64. Fixture sizes and warmup are documented in
[benchmarks/README.md](../benchmarks/README.md).

| Scenario | Iterations | Duration ms | Operations/sec |
| --- | ---: | ---: | ---: |
| Recursive v2 snapshot | 10,000 | 266.609 | 37,508 |
| Migration projection | 20,000 | 6.108 | 3,274,260 |
| Recursive v2 comparison | 10,000 | 972.711 | 10,281 |
| Object valid parse | 100,000 | 634.789 | 157,533 |
| Object invalid parse | 100,000 | 1,850.756 | 54,032 |

These are one-run smoke observations collected while the release build was
running, not isolated performance comparisons. No performance optimization is
included. Before accepting future performance changes, collect at least five
isolated runs per revision on the same machine, use median duration, and
investigate a slowdown over 20% in any listed scenario. This is an initial
review budget, not a portable CI timing assertion or a claim of no regression.


## Project Gate Follow-up

`contract check-many` is implemented under [RFC 0042](../rfc/0042-multi-contract-checks.md).
Four additional CLI tests cover manifest validation before imports, relative
paths, mixed decisions, role presentation, operational precedence, continuation,
v1 side rejection, defaults, text output, and unchanged baselines. All 37 CLI
tests passed. The shared consumer journey also includes a four-entry batch.

Benchmark execution now asserts expected outcomes during warmup and measured
iterations. Two runner regression tests cover incorrectly accepted/rejected
parses, wrong compatibility statuses, and a result changing after warmup.
Standard Schema has an explicit success predicate matching its own protocol.

Expanded verification completed on 2026-09-10: build, metadata, docs,
typecheck, all 229 package tests, 2 benchmark runner tests, benchmarks, examples,
and installed consumer checks passed. `prepare:release` again stopped only at
sandbox DNS for npm audit. Audit with network access reported zero
vulnerabilities; pack dry-run and archive preparation then passed separately.
All constituent gates passed; the combined command itself did not. Eight review
archives were refreshed at the unchanged 3.0.0 version; no publication occurred.
Final documentation and whitespace checks passed.

Earlier benchmark measurements use the previous runner and must not be
interpreted as a direct performance comparison after outcome-checking overhead
was introduced. Per-entry operational errors are complete batch results, while
invalid manifests produce no partial report. Contract modules remain trusted
code; isolation and timeouts are outside this release scope.

## Expanded Product Quality Qualification

Implemented a private `quality/` fixture package with its own exact-version
lockfile: Zod 4.6.1, esbuild 0.28.2, React Hook Form resolver 5.9.1, React Hook
Form 7.87.0, React 19.3.0, TypeScript 5.9.2 and 7.0.2. These do not become
production dependencies. Reference runtime: Node 20.10.0, Darwin arm64.

The generated grammar uses seed `0x5afe31`, 42 schemas and 119 values, comparing
all pairs in three directions and both graph sides. It found a false-breaking
v2 result for an equivalent nullable union: `union([string(), literal(null)])`
versus `nullable(string())`. RFC 0043 and its minimized regression fix equal
literal leaves after opaque guards. All 55 compat tests pass after the fix;
no false-safe witness remains in the tested domain.

Installed declaration fixtures pass with both pinned compilers. Existing
core diagnostics tests cover async order, rejection containment, branch-local
warnings, and immutability; dedicated compile-only fixtures add negative
assignment, transform input/output, discriminated union, recursion, and async
result checks. This does not establish support for every intermediate compiler.

Three independent tarball installations verify:

- form: actual Standard Schema resolver, nested errors, async rejection, and
  explicit handling of native warnings that the resolver does not expose;
- server: HTTP body paths, warning propagation, and validated response recovery;
- CI: single and batch outcomes with unchanged baseline bytes.

The browser-targeted form was also exercised in Chrome 153 via Playwright on
2026-09-10: entering `a` and submitting produced an invalid state with the
minimum-length message; entering `Ada` and submitting produced `Accepted: Ada`.
There were no application console errors; the fixture's absent favicon returned
404. This is agent-run browser evidence, not the independent developer walkthrough.

The latest standalone quality run passed five isolated samples per paired
validation scenario and compiler fixture, plus matched contract benchmarks.
The core runtime artifacts were byte-identical to baseline 3.0. The initial
1,000-schema heap sample was noisy; the final harness retains 10,000 schemas
and performs repeated GC before/after measurement. No budget miss remained in
the subsequent standalone run. Raw samples and source identity are written to
`.tmp/quality/report.json`; CI uploads this report separately per Node version.

For the two-string-field browser fixture, SafeShape and its baseline were
9,656 gzip bytes; the pinned ordinary Zod fixture was 24,703. These fixture
results do not imply a general bundle-size or performance ranking. The
50-check recursive batch with a shared module/baseline took approximately
59 ms median in the standalone run, below its predeclared 5-second usability
budget. This does not measure 50 unrelated module graphs or arbitrary user code.

The intermediate expanded gate was stopped to fix the prototype-key defect
below. The final corrected run is recorded at the end of this document. Remote Node 24 CI evidence, final
versioned release preparation, and the independent walkthrough remain pending.
Use [quality/WALKTHROUGH.md](../quality/WALKTHROUGH.md) for the reviewable exercise.

### Release-blocking prototype-key correction

Further adversarial review found a second defect: adding required `__proto__`
returned `safe` in v1 and v2 because own fields were lost through ordinary
object assignment during description. Runtime `{}` is a concrete counterexample.
RFC 0044 corrects own property writes across Contract IR, v1 snapshots and
JSON Schema, and uses own-property checks for compatibility lookups and snapshot
required-key validation. Tests cover prototype-sensitive additions, malformed
required lists, round trips, lazy ids, and both JSON Schema dialects.

After this correction, 57 compat tests, 80 core tests, and 23 JSON Schema tests
passed. The full quality harness also passed its subsequent matched-baseline
run with the changed core artifacts; the earlier identical-artifact noise
exception no longer applies to this candidate. The browser form was rerun
successfully with the corrected core build. See the
[candidate migration notes](migration-3.0-to-3.1.md) before replacing affected
legacy artifacts. Ordinary baseline formats and public report shapes remain.


### Final local verification after both fixes

All 236 package tests, 2 benchmark runner tests, build, typecheck, metadata,
docs, examples, installed consumer checks, and the expanded quality harness
passed on Node 20.10.0. The combined preparation command stopped at sandbox DNS
for the quality audit. Both quality and workspace audits passed separately with
network access, each reporting zero vulnerabilities. Pack dry-run and all eight
review archives passed separately. Archives still carry 3.0.0; they are not a
published or versioned 3.1 release candidate.

The final quality report has no regressions, inconclusive measurements, or
measurement-noise exceptions. The 50-check shared recursive fixture had a median
of about 57.3 ms. The paired browser fixture measured 9,654 gzip bytes for the
candidate, 9,656 for baseline, and 24,703 for pinned ordinary Zod. These remain
scoped workload results, not a general library ranking.

The report records patch SHA-256
`8c6af62d799dca30f7755aeab18db05ca1e018f3e1e909e80c777159831559df`
at execution time (later evidence-document edits are outside that capture).
Its browser bundle SHA-256
`f20439eddbb431bb4c669f52e701042a66a78fe77b5eac4094adcd6b1bd8aebf`
matches the bundle tested in Chrome after the prototype fix. A separate final
resolver check also confirmed that a rejected callback's private error text is
not exposed through the external form resolver.

Remaining release gates: independent developer walkthrough, configured CI on
the exact versioned candidate (including Node 24), final version selection and
explicit publication approval. No remote CI result or human review is claimed.
