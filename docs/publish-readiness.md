# Publish Readiness

SafeShape packages are published only after explicit release approval. Use this
checklist before running `npm publish`.

## Pre-Approval Checklist

- Confirm the release scope and package list.
- Confirm all workspace packages use the intended release version.
- Confirm no breaking API changes were introduced without an RFC.
- Confirm new public APIs have docs and tests.
- Confirm package-boundary architecture changes have an ADR.
- Confirm package versions are aligned with the root version.
- Confirm package dependency direction still matches `docs/package-architecture.md`.
- Confirm the new `@safe-shape/compat` package is published manually before
  GitHub Actions publishes CLI and umbrella packages that depend on it.
- Confirm `safe-shape` is published after all scoped packages.
- Confirm `docs/integration.md` reflects the intended consumer integration flow.
- Confirm `docs/migration-1-to-2.md` covers the supported 1.x upgrade path.
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
2. Commit the release version and push its `v<version>` tag.
3. Run the `Publish npm packages` GitHub Actions workflow on that tag with
   phase `bootstrap-core`.
4. Manually publish the generated `@safe-shape/compat` archive.
5. Rerun the workflow with phase `release`.

Do not publish unrelated packages.
