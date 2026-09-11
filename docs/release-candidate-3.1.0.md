# SafeShape 3.1.0 release candidate

Status: versioned candidate; not published.

Release preparation/publication authorized by the user on 2026-09-11. This
supersedes the previous publication hold but does not mark quality checks or
the independent walkthrough complete. The unpublished working 3.2 scope is
included in this additive 3.1.0 release; 3.0.0 is the previous published version.

## Release notes

- Check a project manifest with `contract check-many`; receive aggregate
  compatibility, migration, manual-review and operational-error results.
- Generate bounded counterexamples from v1/v2 input snapshots with
  `createContractCounterexamples()` or CLI `--counterexamples`. Supported finite
  trees include scalars, native string lengths, objects, arrays, ordinary unions,
  optional and nullable wrappers. Returned JSON values are deeply immutable.
- Generate Markdown review artifacts with CLI `--markdown`, including original
  findings, migration suggestions, optional witnesses and batch HTTP roles.
- Correct equal-literal graph compatibility and preserve prototype-sensitive
  properties/definition ids across descriptions, snapshots and JSON Schema.
- Expand runtime soundness, type inference, consumer installation and quality
  evidence; benchmark assertions now validate their expected outcomes.

## Upgrade and limits

Public additions are backward-compatible with the published 3.0.0 API. Default
CLI reports and snapshot formats remain unchanged. See the
[migration notes](migration-3.0-to-3.1.md) for corrected prototype-sensitive
artifacts: review affected baselines explicitly; do not automatically replace
them. Counterexample absence never proves compatibility. Recursion/references,
opaque behavior and output-side synthesis remain outside the supported domain.
See [counterexample limits](counterexamples.md) and [review output](contract-review.md).

Earlier scalar-only counterexample types were unpublished development versions;
consumers of those checkouts must handle composite JSON and unavailable reasons.

## Candidate verification

- [x] Synchronize all eight workspace packages, root and internal lockfile versions.
- [x] Specify performance measurement correction in ADR 0034; retain budgets and prior failures.
- [x] Run full versioned `prepare:release`, audit and archive/consumer verification.
- [ ] Record successful CI for the exact candidate.
- [ ] Record independent developer walkthrough with no unresolved blockers.
- [ ] Tag and dispatch trusted publishing only after all mandatory gates pass.
- [ ] Verify all eight registry versions and release artifacts after publication.

No previous local checks are presented as successful verification of this
versioned candidate. Detailed historical evidence remains in the
[3.2 development record](release-evidence-3.2.md).

## Local candidate evidence

`npm --fetch-retries=0 run prepare:release` completed with exit 0 on Node
20.10.0: 250 package tests, two benchmark runner tests, build, types, docs,
examples, installed consumers, quality, both zero-vulnerability audits and
packaging. Log: `/tmp/safe-shape-310-candidate.log`.

The ADR 0034 quality run passed with no budget regressions. Module-import
medians over 50 samples were 3.2679 ms (candidate) and 3.2767 ms (3.0 baseline).
Measured patch SHA-256:
`ccf78c81f98682095ea74c061a27748dd47614e01325c659a64e405ddc153331`.
Release-status documentation was finalized afterwards; installed-consumer and
archive generation were repeated after the package README wording update.
Earlier failed measurements remain recorded in the development evidence and
are not represented as successful runs.

Exact candidate CI and the independent walkthrough are still pending. No
release tag or npm publication has occurred.
