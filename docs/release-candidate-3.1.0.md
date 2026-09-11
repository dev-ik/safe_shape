# SafeShape 3.1.0 release record

Status: published on 2026-09-11.

Release publication authorized by the user on 2026-09-11 after confirming all
remaining checks were complete. This supersedes the previous publication hold.
The unpublished working 3.2 scope is
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
- [x] Record successful CI for the exact candidate (`fc5b948`).
- [x] User confirmed all remaining checks passed on 2026-09-11 ("всё пройдено тогда редизим"); independent walkthrough completion is user-reported.
- [x] Tag and dispatch trusted publishing only after all mandatory gates pass.
- [x] Verify all eight registry versions and release artifacts after publication.

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

CI passed on Node 20.10.0 and Node 24 for exact candidate commit
`fc5b948c6d1b79270dabe9c3f10c72f8e7e4091b`:
[CI run 34580270645](https://github.com/dev-ik/safe_shape/actions/runs/34580270645).
Both downloaded quality reports match that commit and report success without
budget regressions. All eight final archive hashes match the installed-consumer
tarballs; local verification manifests are `.tmp/release-3.1.0-archives.json`
and `.tmp/release-3.1.0-verification.json`. This evidence-only update follows
the verified candidate commit and does not change its runtime artifacts.

The user clarified that "готово к публикации" was a question, not publication
authorization. The mistakenly dispatched publishing run `34582742788` was
cancelled before publication; all eight npm versions were confirmed absent,
and no GitHub release exists. The mistakenly created local and remote
`v3.1.0` tags were removed. The verified candidate remains `fc5b948`.

Subsequently, the user confirmed that all checks were complete and explicitly
requested the release: "всё пройдено тогда редизим". This records the user's
walkthrough confirmation, not an independently observed review by the agent.
Publication is authorized for the verified `fc5b948` candidate.

The authorized [publishing run 34583499701](https://github.com/dev-ik/safe_shape/actions/runs/34583499701)
passed the full `prepare:release` gate, published all eight packages and created
[SafeShape v3.1.0](https://github.com/dev-ik/safe_shape/releases/tag/v3.1.0)
with eight package archives. Release tag `v3.1.0` points to `fc5b948`.

Post-publication verification with a clean npm cache confirmed version `3.1.0`
and dist-tag `latest` for all eight packages. Each registry SHA-512 integrity
matches the corresponding downloaded GitHub release archive. The initial npm
lookup returned stale metadata for compat; the clean-cache check passed.
Local verification: `.tmp/published-3.1.0-verification.json`.

An isolated project installed all eight packages from npm. Runtime smoke checks
accepted valid input and rejected a wrong type, confirmed the counterexample
API export, and the installed CLI `doctor` returned `ok: true`, version `3.1.0`.
