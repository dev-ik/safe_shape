# SafeShape 3.3 development evidence

Status: versioned 3.3.0 candidate; no tag or publication. Full release
qualification and independent developer walkthrough are recorded separately below.

## Paired runtime measurements

Five alternating isolated samples per library/scenario, using the unchanged
quality/measure.mjs runner: 2,000 warmup, 20,000 measured operations per mode,
asserted outcomes and actual issue/formatting consumption. Node v20.10.0,
macOS arm64. Before is the 3.2.1 core build saved at task start; after includes
root-only async detection caching and no-check result reuse. Zod is pinned 4.6.1.
These local fixture medians include harness overhead, not pure parser timings.

| Scenario | Before valid µs | After valid µs | Zod valid µs | Before invalid µs | After invalid µs | Zod invalid µs |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| constraint | 0.336 | 0.266 | 0.222 | 4.456 | 4.454 | 0.596 |
| nested | 1.735 | 1.455 | 0.600 | 5.754 | 5.265 | 0.855 |
| optional-nullable | 1.213 | 0.841 | 0.387 | 5.811 | 5.275 | 0.767 |
| array | 0.791 | 0.649 | 0.361 | 5.052 | 5.088 | 0.872 |
| tagged | 1.428 | 0.985 | 0.463 | 5.632 | 5.102 | 0.742 |
| union | 0.456 | 0.289 | 0.250 | 6.824 | 6.905 | 1.064 |
| record | 0.788 | 0.658 | 0.473 | 4.767 | 4.565 | 1.026 |
| recursive | 2.752 | 2.315 | 1.145 | 6.181 | 5.861 | 1.600 |
| transform | 0.427 | 0.297 | 0.271 | 4.644 | 4.439 | 0.617 |
| async | 0.493 | 0.492 | 0.409 | 2.208 | 2.253 | 1.126 |
| composition | 1.376 | 1.005 | 0.461 | 5.179 | 4.947 | 0.689 |
| pipeline | 0.592 | 0.385 | 0.270 | 4.649 | 4.572 | 0.529 |

Valid paths improved most (nested ~16%, tagged ~31%, pipeline ~35%). Invalid
paths changed less, and Zod remains faster in these fixtures. CPU sampling of
the nested fixture identified native ValidationError construction as the largest
sampled core cost; this change preserves Error identity, message and stack.
No diagnostics are suppressed and no global stack settings are changed.

Local raw evidence: `.tmp/release-3.3/paired.json`, including all five samples,
consumed-diagnostics/formatting modes and source identities. Hashes cover sorted
root JS artifacts (filename plus bytes):

- before: `ebfbb29d20f6cc670518266cf5347981f23d5c5a1fbb7467cbc3182c60c571cc`
- after: `1ef8b5fcb74a31615b57cc01a2ae25031217af34b28c0069976bd5319079bc62`
- zod: `105e50ed8cf8899b5308b28ad25ee6f9fa4af58cc94805e83722b65261f38e97`

## Verification

- Targeted tests: core 96, compat 76, JSON Schema 27 passed.
- Workspace build, typecheck and examples passed after implementation.
- Full package suite: **286 tests passed** (core 96, compat 76, CLI 44,
  HTTP 18, JSON Schema 27, TypeScript 12, validation 12, umbrella 1).
- Two benchmark-runner tests and three migration-tool tests passed; production
  examples also passed under strict unhandled-rejection handling.
- New checked-output connection benchmark: 1,000 verified checks in 13.992 ms,
  within its predeclared five-second fixture budget.
- Documentation coverage at initial implementation: 55 reviewed EN/RU pairs; current API guides and all
  eight packaged Russian READMEs are present. Missing-page, missing-translation
  and changed-text rejection paths were separately exercised.
- Installed consumers, real resolver/browser-targeted VM, server, CI and
  production fixtures passed. Quality reports **zero regressions, zero
  inconclusive results and zero noise exemptions**.
- Selected consumer bundle: SafeShape 48,033 minified / 10,589 gzip bytes;
  Zod 84,057 / 24,703 bytes. This is one fixture, not a universal size comparison.
- `release:check` reached and passed quality and migration checks, then exited 1
  at the quality dependency audit because registry DNS failed (`ENOTFOUND`).
  The initial network escalation was rejected pending explicit authorization
  to export dependency-tree metadata. After user authorization, both audits
  were rerun on 2026-09-30 and exited 0: **zero known vulnerabilities** in the
  quality and root dependency trees. Reports are recorded separately in
  `.tmp/release-3.3/audit-quality.json` and `.tmp/release-3.3/audit-root.json`.
  This completed the previously blocked audit steps. The subsequent versioned
  preparation below also passed the full chained command.
- Final documentation-only polish passed docs and installed-consumer checks;
  runtime implementation is unchanged. Both READMEs were verified in all eight
  installed packages. Final `pack:check` passed for all eight packages.
- Final review and `git diff --check` passed; existing exact-mode, snapshot and
  public parse behavior tests remain passing. No dependencies were added.
- Remote CI for a final committed/versioned candidate: not run.
- Independent developer walkthrough for the checked-output journey: pending.

The existing user modification to docs/implementation-plan-3.1.md is retained.
Package versions are synchronized to 3.3.0 for local release preparation. This is not a release
publication record or a claim of general performance parity with Zod.

## Quality run identity

- Commit: `74ce3624f6c5e48d41ee7af535098c8d9b9dac07`.
- Working-tree patch SHA-256 at measurement: `b2fbb4d177b1b4c4b5bd10639afe3b9767cf101460c6520efcc8e210ec47fe02`.
- Baseline: `13e0f8ac382a7baf8686fd0992a701736c9a3760`.
- Core artifacts: `67e9f3c59554f2dfbfd00c6970028b483eca6e1b51519e9465c4d933b2c14b7a` (quality runner hashes JS and declarations).

Reports remain in `.tmp/quality/report.json` and `.tmp/release-3.3/`.
This evidence document and final documentation-only navigation/wording edits
postdate that source identity. The dependency audit blocker is resolved.
Publication still requires final candidate qualification, including configured CI
and an independent developer walkthrough. The versioned candidate is not yet
a record of publication approval.

## Versioned 3.3.0 preparation (2026-09-30)

`npm run prepare:release` completed successfully (exit 0), including the full
`release:check` chain and creation of eight 3.3.0 archives. Both dependency audits
reported zero known vulnerabilities. All 286 package tests, build, typecheck,
examples, benchmark, installed-consumer, quality, migration and pack checks passed.
The quality report contains no regressions, inconclusive results or noise exemptions.

Versions and internal dependency pins are synchronized across manifests and the
root lockfile. All eight archives were checked for version, dependency pins and
byte-identical EN/RU READMEs. Archives and SHA-256 checksums are in
`release-artifacts/`; the complete log is
`.tmp/release-3.3/prepare-release-3.3.0.log`. CLI doctor reports 3.3.0 and success.

Quality source commit: `74ce3624f6c5e48d41ee7af535098c8d9b9dac07`; working-tree patch SHA-256:
`238f21db305a733c82fd4bee81f152f022574993f8d3f2a99ff9918cbb03457b`. The updated report remains in `.tmp/quality/report.json`.
This evidence section was added after the run and is not part of that measured patch.

Documentation now has 56 EN/RU pairs, including 3.3.0 release notes and upgrade
instructions. The current Russian README links to translated guides. Docs checks
cover 230 Markdown files. Historical evidence and normative RFC/ADR remain English.

Remote CI for the final commit and the independent developer walkthrough remain
pending. No commit, release tag, remote push or publication was performed by this
preparation. Local gate success does not mark those qualifications complete.

## Publication authorization

The owner explicitly instructed publication after disclosure that the independent
developer walkthrough remained incomplete. This is authorization to proceed with
that limitation, not a claim that a human walkthrough passed. Final-commit CI
will still be required before dispatching the publishing workflow.
