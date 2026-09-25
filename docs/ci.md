# Contract Checks in CI

SafeShape contract checks are provider-neutral: commit a reviewed snapshot,
rebuild the current schema module, and compare it with the stored baseline.
Never update a baseline automatically in a compatibility job. A baseline
change is an API decision and should be reviewed together with the schema.

## Project Scripts

For recursive schemas or independently checked transform sides, create a v2
baseline explicitly:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "contracts:snapshot": "safe-shape contract snapshot --module ./dist/contracts/user.js --export userSchema --id user --format v2 --out ./.safe-shape/user.contract.json",
    "contracts:check": "safe-shape --json contract check --module ./dist/contracts/user.js --export userSchema --against ./.safe-shape/user.contract.json --side input"
  }
}
```

Snapshot v1 remains the default for existing non-recursive baselines. Omit
`--format v2` when creating v1, and omit `--side` when checking it. The check
command detects the stored format.

Before the first local `contracts:snapshot` run, create `.safe-shape` and build
the exported schema module. Keep that module free of console output when
consuming CLI JSON. Baseline creation belongs to the reviewed local workflow,
not to the CI check job.

## Portable Shell Gate

The same commands work in any CI system with Node.js and npm:

```sh
npm ci
npm run build
npm run contracts:check > contract-report.json
```

The check exits with `0` for `safe` and `annotation-only`, `2` for `breaking`,
`risky`, or `unknown`, and `1` for operational errors. Preserve
`contract-report.json` as a job artifact when the provider supports artifacts.

Under `--json`, the result includes a `migration` projection:

```json
{
  "decision": "migration-required",
  "migrationRequired": true,
  "manualReviewRequired": false,
  "counts": {
    "safe": 0,
    "breaking": 1,
    "risky": 0,
    "unknown": 0,
    "annotationOnly": 0
  },
  "summary": "Contract migration is required for 1 breaking finding.",
  "diagnostics": []
}
```

`migration-required` means a proven breaking relationship exists.
`manual-review` means the relationship is risky or cannot be proven.
`compatible` means no migration is required by the selected compatibility mode.
Diagnostics are guidance; SafeShape does not rewrite code or update baselines.

## GitHub Actions

```yaml
name: contracts
on: [push, pull_request]

permissions:
  contents: read

jobs:
  compatibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: "24"
          cache: npm
      - run: npm ci
      - run: npm run build
      - run: npm run contracts:check > contract-report.json
      - if: always()
        uses: actions/upload-artifact@v6
        with:
          name: contract-report
          path: contract-report.json
```

## GitLab CI

```yaml
contracts:
  image: node:24
  script:
    - npm ci
    - npm run build
    - npm run contracts:check > contract-report.json
  artifacts:
    when: always
    paths:
      - contract-report.json
```

If a deliberate breaking change is approved, create the new snapshot locally,
review its semantic diff, and commit it in the same change. Do not make the CI
job accept a failure by regenerating the file it is meant to verify.

## Reproduce a Contract Evolution Review

The repository provides a checked example with recursive v2 schemas:

```sh
npm run build
node examples/check-contract-evolution.mjs packages/cli/dist/cli.js
```

In an installed consumer project, copy `examples/contract-evolution.mjs` and
`examples/check-contract-evolution.mjs` together, install `safe-shape`, and run:

```sh
node check-contract-evolution.mjs
```

The runner creates an isolated temporary baseline, checks both input and output
sides, and asserts safe, breaking, unknown, and operational-error outcomes. It
also checks that baseline bytes remain unchanged after every comparison and
removes only its own temporary directory. The release consumer check runs the
same example against installed tarballs.

For application-owned HTTP explanations, compose the existing projections:

```js
import { explainChange, narrowed } from "./contract-evolution.mjs";

const { report, migration, http } = explainChange(narrowed, {
  exchange: "request",
  compatibility: "backward",
  side: "input",
});

console.log(http.summary);
for (const diagnostic of migration.diagnostics) {
  console.log(diagnostic.path, diagnostic.direction, diagnostic.message, diagnostic.suggestion);
}
```

`http.findings` associates each original finding with its producer/consumer role
and client/server party. These roles describe the selected compatibility
relationship, not a discovered list of deployed services. Forward response
checks describe the server producer concern; backward request checks describe
the server consumer concern. Use `full` when both directions must hold.

For `migration-required`, inspect the reported path and coordinate the affected
producer/consumer changes before approving a baseline update. For `manual-review`,
review the opaque rule or missing proof; an `unknown` result does not prove
breakage or safety. Matching opaque ids assert unchanged semantics, so changing
callback behavior requires changing its id. The check never approves that
assertion on the application's behalf.

After an intentional migration is reviewed, create a new baseline explicitly,
review its diff with the schema change, and commit both. Never regenerate a
production baseline merely to make a failing compatibility job pass.

## Gate a Project with Several Contracts

Maintain a reviewed `contracts.json` manifest using the
[check-many format](api/cli.md#check-multiple-contracts), then replace the single
check script with:

```json
{
  "scripts": {
    "contracts:check": "safe-shape --json contract check-many --manifest ./contracts.json"
  }
}
```

The shell and CI artifact examples above work unchanged. The aggregate report
includes every entry even if an earlier module or baseline failed. Exit 1
means the batch contains an operational failure; it takes precedence over
exit 2 for migration or review. Inspect all `results`, not only the exit code.
Manifest paths are relative to the manifest file, making the same list usable
from a different working directory. Baseline creation and approval remain
explicit per-contract operations.

## Explicit connections (since 3.2.0)

Use `safe-shape --json contract check-connections --manifest connections.json`
to check registered producer output against consumer input snapshots. See the
[connection manifest guide](contract-connections.md) and the runnable
[connected-contracts example](../examples/connected-contracts.mjs). These checks
read reviewed baselines; they do not discover deployments or replace snapshots.
