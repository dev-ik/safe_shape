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
