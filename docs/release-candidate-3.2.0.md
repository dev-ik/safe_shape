# SafeShape 3.2.0 candidate: composable and connected contracts

Status: local qualification passed after production/diagnostics polish; all eight
archives are verified. Final CI is recorded separately; the independent human
walkthrough remains pending. Not published.

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

The current published version remains 3.1.0. All eight development packages and
the root lockfile are synchronized to 3.2.0; no tag or registry publication has
been performed. This local candidate still needs CI for its final commit and an
independent developer walkthrough before a stable release claim.

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
[current qualification and artifact hashes](release-polish-3.2.0.md).

See [final readiness verification](release-readiness-3.2.0.md) for Node 24, the
fresh-project/browser pass, executable packaging correction and final CI branch.
