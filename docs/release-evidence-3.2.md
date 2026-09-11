# 3.2 development evidence: scalar counterexamples

Initial qualification: 2026-09-10. Working release label only; all package versions remain 3.0.0.
Publication is on hold. This document does not qualify a final versioned stable
candidate or replace the outstanding 3.1 release checklist.

## Implemented

[RFC 0045](../rfc/0045-contract-counterexamples.md) and
[ADR 0032](../adr/0032-scalar-counterexample-validation.md) define the scalar
support matrix, unavailable outcomes, candidate limit and package boundary.
`createContractCounterexamples()` supports validated same-format snapshots and
immutable directional root results. Single and batch CLI checks expose them
only with `--counterexamples`; default reports and exit semantics are preserved.

The initial tests used 18 runtime schemas across all ordered pairs, both snapshot formats,
and both containment directions: 1,296 directional cases. Every returned
witness must pass the original source schema and fail the original target.
Additional cases cover limits, invalid inputs, opaque callbacks, unsupported
domains, JSON roundtrips, deterministic results and immutable containers.
This bounded evidence is not proof of arbitrary contract relationships.

## Local verification: 2026-09-10

- Full build, typecheck, release metadata and documentation checks passed.
- 241 package tests and two benchmark runner tests passed.
- Runnable examples and installed-tarball consumer checks passed, including
  scalar witnesses, migration/HTTP composition, both CLI commands and baseline
  preservation.
- `cli:doctor` and `git diff --check` passed.
- Both root and isolated quality dependency audits returned zero vulnerabilities
  using registry access.
- The predeclared scalar benchmark budget is 10,000 measured calls in 5 seconds.
  On Node 20.10.0 this run took 302.785 ms, with 10,000 expected witnesses and no
  outcome failures. Raw data is in `.tmp/benchmarks/report.json`.
- Isolated quality harness passed with no budget regressions or measurements
  classified as noise. Installed CI, form resolver bundle, server integration,
  declaration consumers and compiler fixtures passed. Raw report:
  `.tmp/quality/report.json`, measured patch SHA-256
  `427ae0498bc7976cfecb29fc2aef509e9c1f0ccaab1850e0026c8ffd14654d2a`.
  This evidence document was finalized after measurement and is not included
  in that measured source hash.
- Package dry-run checks passed for all eight packages at version 3.0.0;
  log: `/tmp/safe-shape-32-pack.log`.

The combined release gate stopped at audit because sandbox DNS could not
resolve the npm registry. Both audits passed separately with registry access;
the remaining pack check also passed separately. Do not report the combined
command itself as a successful exit.

Combined gate log: `/tmp/safe-shape-32-release.log`. Narrow check logs:
`/tmp/safe-shape-32-compat.log` and `/tmp/safe-shape-32-cli.log`.
Generated evidence in `.tmp` is local and ignored by git.

## Remaining release work

Independent developer walkthrough, final version sequencing and synchronized
metadata, exact candidate CI and versioned archive verification remain open.
No new browser UI behavior was introduced; the full harness exercises the
existing resolver bundle, while the previous manual browser run is historical
evidence and is not represented as a new run for this change.
No release tag, publication, or registry installation of a new release occurred.

## String-length extension: 2026-09-11

[RFC 0046](../rfc/0046-string-length-counterexamples.md) extends the scalar
domain with native string-length constraints. Candidate generation is capped
at 1,024 code points per synthesized string, before allocation. Skipped lengths
produce `construction-limit` when no witness is found. Pattern, format,
refinements, composite roots and output synthesis remain unsupported.

The runtime matrix now has 24 schemas and 2,304 directional cases, including
Unicode literals and bounded string roots. Focused tests cover astral and
combining characters, alternate representatives, boundaries at and beyond the
construction cap, large declared lengths, unchanged contracts, and supplied
literals longer than the synthesis cap. CLI and installed-consumer examples
cover string narrowing in both single and batch commands with unchanged baselines.

Narrow checks passed: 63 compat tests and 39 CLI tests. The full
`npm --fetch-retries=0 run release:check` command passed with exit 0 and registry
access; log: `/tmp/safe-shape-string-release.log`. This covers build, typecheck,
244 package tests, two benchmark runner tests, docs, metadata, examples,
installed consumers, the isolated quality harness, both audits and package
dry-runs. Both audits reported zero vulnerabilities. No publication was run.

The string fixture took 508.543 ms for 10,000 searches (all expected witnesses),
within the separately predeclared 5-second budget. The numeric fixture took
316.403 ms. The quality harness passed without budget regressions or noise
classifications. Its measured patch SHA-256 is
`4e80c7f5847e4be1026dec2244076aab41e2bd79c9e7032863338e1d0a2d2772`;
this evidence and roadmap were finalized after measurement. Raw benchmark and
quality reports in `.tmp` now describe this run, replacing the previous local
reports. Independent walkthrough and exact versioned candidate CI remain open.

## Composite witnesses and Markdown review: 2026-09-11

[RFC 0047](../rfc/0047-composite-counterexamples-and-review.md) and
[ADR 0033](../adr/0033-bounded-composite-search-and-review.md) add finite object,
array, ordinary union, optional and nullable construction. Full root validators
check every returned value. Schema depth/width, local search, root attempts and
expanded value sizes have explicit bounds. Objects and arrays are deeply frozen;
prototype-sensitive keys survive runtime validation and JSON serialization.

The additional composite matrix covers 10 schemas, both snapshot formats and
both directions (400 directional cases), alongside targeted available witnesses
for required additions, nested constraints, enum removal, property policies,
array length/items and union removal. Depth, width, recursive references and
expanded array sizes have explicit unavailable checks.

CLI `--markdown` renders existing decisions, findings, migration suggestions,
fingerprints, optional examples and batch HTTP roles/errors. Tests verify
escaping, safe JSON fences, invalid flag rejection before module execution,
unchanged exit semantics and baseline preservation. Comparison and examples
now reuse the same next snapshot. Installed-consumer examples include a complete
nested payload and single/batch Markdown output.

Narrow checks passed: 66 compat tests and 42 CLI tests. The runnable evolution
example passed. The full gate passed build, typecheck, metadata, docs, 250 package
tests, two benchmark runner tests, examples, benchmarks and installed consumers.
Log: `/tmp/safe-shape-composite-release.log`.

Before measurement, the composite benchmark budget was set to 1,000 searches
in 5 seconds. It completed in 285.979 ms with 1,000 expected witnesses. The
string and numeric fixtures completed 10,000 calls in 530.459 and 337.855 ms.

The first quality run stopped the combined command with exit 2: array-scenario
cold import median was 3.8258 ms versus 3.1360 ms for baseline (ratio 1.2200,
budget 1.2). Preserve this result at `.tmp/composite-quality-first.json`.
An explicit 15-pair diagnostic rerun with alternating library order, unchanged
code and unchanged budget did not reproduce it: medians 3.1662 / 3.3770 ms,
ratio 0.9376. Raw samples: `.tmp/composite-import-recheck.json`.
This does not erase the first failure or automatically classify it as noise.
The complete quality rerun also returned exit 2; log:
`/tmp/safe-shape-composite-quality-recheck.log`. The original array-import miss
did not recur, but three other ratios exceeded the unchanged 1.2 budget:

| Scenario | Metric | Candidate / baseline |
| --- | --- | --- |
| tagged | importMs | 1.2992 |
| union | validMs | 1.2532 |
| record | importMs | 1.2265 |

Their measured ranges overlap, but the harness did not classify them as noise.
No thresholds or failure policies were changed. The cause is unresolved; do not
claim a passing performance qualification or attribute the failures to the new
counterexample code without further evidence. The new counterexample operation
budgets passed independently. Preserve the final raw report at
`.tmp/quality/report.json`, patch SHA-256
`a6ec97b81ed9f84d3fd1db8d25cdcd0416ec3df800a0bb093e20bf20f752670d`.
This evidence and roadmap were finalized after that measurement.

Both dependency audits completed separately with zero vulnerabilities; package
dry-runs also passed (`/tmp/safe-shape-composite-pack.log`). The combined command
itself did not pass and is not reported as a successful exit.

A review example was generated at `.tmp/contract-review-3.2.md` with a temporary
baseline at `.tmp/review-payload-baseline.json`. Its command returned the expected
exit code 2 for a breaking change and emitted the complete Markdown artifact
on stdout. These ignored files are local previews, not published artifacts.
