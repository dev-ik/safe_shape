# Publish Readiness

SafeShape packages are published only after explicit release approval. Use this
checklist before running the trusted-publishing workflow.

## Pre-Approval Checklist

- Confirm the release scope and package list.
- Confirm all workspace packages use the intended release version.
- Confirm no breaking API changes were introduced without an RFC.
- Confirm new public APIs have docs and tests.
- Confirm package-boundary architecture changes have an ADR.
- Confirm package versions are aligned with the root version.
- Confirm package dependency direction still matches `docs/package-architecture.md`.
- Confirm the workflow publishes every package in dependency order and skips
  versions that are already present in npm.
- Confirm `safe-shape` is published after all scoped packages.
- Confirm `docs/integration.md` reflects the intended consumer integration flow.
- Confirm `docs/migration-1-to-2.md` covers the supported 1.x upgrade path.
- Confirm `docs/migration-2-to-3.md` covers the supported 2.x upgrade path.
- Run `npm run docs:check` and confirm local links and EN/RU navigation pass.
- Confirm runnable examples pass.
- Confirm benchmark smoke checks pass.
- Confirm consumer tarball installation passes.
- Confirm `npm run release:check` passes.

## Consumer Tarball Check

Run:

```sh
npm run build
npm run consumer:check
```

`consumer:check` creates package tarballs, installs them into
`.tmp/consumer-check/app`, imports every public package from that temporary
consumer project, and verifies the installed CLI binary.

## Publish Approval

Only after approval:

1. Run `npm run prepare:release`.
2. Commit the release version and push the default branch.
3. Create and push its annotated `v<version>` tag.
4. Run the `Publish npm packages` GitHub Actions workflow on that tag with
   phase `release`.

The `compat-only` phase is reserved for recovery of an older partially
published tag and is not part of a normal release.

Do not publish unrelated packages.
