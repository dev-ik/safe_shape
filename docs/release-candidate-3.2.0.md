# SafeShape 3.2.0 release: composable and connected contracts

Status: published on 2026-09-25. All eight npm packages and GitHub release
archives match the qualified candidate. Publication and consumer verification
are recorded below.

## User-visible changes

- Immutable object `shape`, `pick`, `omit`, `partial`, `required` and add-only
  `extend`, retaining field rules, annotations and unknown-property policies.
- Checked `pipe` execution with original input inference, checked output,
  deterministic warnings/paths and explicit async behavior.
- Recursive and mutually recursive TypeScript declarations, deterministic names
  and `schema types --side input|output`.
- Explicit `checkContractConnection` and CLI `contract check-connections` for
  producer output → consumer input snapshots, with migration diagnostics and
  independently verified producible JSON counterexamples when supported.
- Boundary-only native error construction, complete connection text diagnostics
  and production examples with isolated logging and controlled failure results.
- Tagged-union and tuple counterexamples in existing single/batch checks.
- A restricted, non-executing Zod source migration tool, guides and installed
  form/server/CI journeys. No runtime dependency was added.

See [RFC 0048](../rfc/0048-composable-runtime-contracts.md),
[the composition guide](composable-contracts.md),
[connection semantics](contract-connections.md), and
[migration from Zod](migration-from-zod.md).

## Compatibility and limits

The release adds APIs while retaining existing parsing, snapshot formats, CLI
envelopes and exit codes for existing commands. Object extension rejects field
replacement; compose before attaching object-level checks. Pipelines and opaque
production remain conservative in tooling. Recursive type aliases that cannot
be expressed in TypeScript fail explicitly. Migration handles only the documented
subset and never overwrites an existing source file.

All eight published packages and the root lockfile use 3.2.0. The previous
published version is 3.1.0. The owner authorized this release after disclosure
that the independent human walkthrough was incomplete; that gate is an explicit
owner-approved exception, not a completed human check.

## Qualification

The initial development gate passed functional checks, installed consumers and
the quality harness with no budget regressions or inconclusive measurements. It
stopped at audit because sandbox DNS could not resolve registry.npmjs.org; it is
not recorded as a passing combined command. Additional recursive-record/helper-name
compile regressions were added during review. That run does not qualify the final
versioned candidate. Its raw report is retained at `.tmp/quality-next-first.json`;
log: `/tmp/safe-shape-next-release.log`.

Before the production/diagnostics polish, `npm --fetch-retries=0 run prepare:release` passed with exit 0: 268 package
tests, two benchmark-runner tests, three migration tests, all local gates, both
zero-vulnerability audits and eight verified archives. See the
[complete evidence and Zod comparison](release-evidence-3.2.0.md). Zod remained
faster in the measured parse workloads; SafeShape passed its unchanged budgets
and produced a smaller bundle for the selected consumer fixture.


The final polish gate also passed `prepare:release`: 274 package tests, three
production tests (including installed consumers), existing benchmark/migration
checks, clean audits and eight verified archives. Error workloads improved by
2.56×–4.26× against the preceding candidate in the direct paired experiment;
issue consumption and formatting retain the gain. See the
[qualification measurements](release-polish-3.2.0.md). The final published
archive hashes are recorded under [verified publication](#verified-publication).

See [final readiness verification](release-readiness-3.2.0.md) for Node 24, the
fresh-project/browser pass, executable packaging correction and final CI branch.


## Verified publication

Signed tag `v3.2.0` points to
`ebfcdd0509a04204a69e00e46a4964726ced7b41`.
[Exact-candidate CI](https://github.com/dev-ik/safe_shape/actions/runs/36123664775)
passed on Node 20.10.0 and Node 24. Every archive from both jobs matched the
qualified local archive byte for byte.

The authorized [publishing workflow](https://github.com/dev-ik/safe_shape/actions/runs/36136351189)
repeated the full `prepare:release` gate, published all eight packages through
npm trusted publishing and created [SafeShape v3.2.0](https://github.com/dev-ik/safe_shape/releases/tag/v3.2.0)
with all eight archives. The owner's explicit release instruction followed
disclosure of the incomplete independent human walkthrough. The agent's
HTTP/browser walkthrough does not count as that human check.

Post-publication verification confirmed version and `latest` equal to 3.2.0
for every package. Registry SHA-512 integrity and SHA-1 values, downloaded npm
tarballs and GitHub release assets all match the qualified local archives.

A fresh project with a clean npm cache installed all eight packages from the
registry. All public library imports and CLI `doctor` passed. Five actual HTTP
requests verified malformed JSON, invalid input, service failure, invalid
response and successful processing after those failures, with rejecting loggers
contained under strict unhandled-rejection handling. Object composition,
pipelines, recursive declarations, input/output inference and connection checks
also passed; generated types compiled with TypeScript 5.9.2 and 7.0.2.

Local machine-readable evidence is retained in `.tmp/readiness/`:
`publish-run.json`, `published-registry.json`, `published-assets.json` and
`published-walkthrough.json`.

Final published archive SHA-256 values:

- `safe-shape-3.2.0.tgz`: `6e9f5195fa3f57f444a9acf6efdccf557ec4844859a3be77d98bcf0910c8a3a1`
- `safe-shape-cli-3.2.0.tgz`: `7d6a9ee9cda54bd7bb28edab4113ccc7b74614620c6a5b3562180c5006b4c66c`
- `safe-shape-compat-3.2.0.tgz`: `501b8aed4d9892d036fc9e826f866ca619c832c72e451b000c8b384691beb28a`
- `safe-shape-core-3.2.0.tgz`: `4d5eb27317c6ea967270834ad229675bc27732e9b5859b62c3ace448f7b4f301`
- `safe-shape-http-3.2.0.tgz`: `cbbeedc0710c1b510cb1af1c4fa590da105f473121063d96046a283ab635cb90`
- `safe-shape-json-schema-3.2.0.tgz`: `d4139fb69a00974448adc46794dd018b179552ff4bbb675338d512a2d20b350c`
- `safe-shape-typescript-3.2.0.tgz`: `367ea408b5ec6cb75fa89e301402f4a4424d508a6bbbde04451ddf7e71da012e`
- `safe-shape-validation-3.2.0.tgz`: `545cde08c523c019813a0df3cbe8d2a8dcbfd7b595dfdefba0c901ae0b41bc57`
