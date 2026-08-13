# Publish Readiness

SafeShape packages are published only after explicit release approval. Use this
checklist before running `npm publish`.

## Pre-Approval Checklist

- Confirm the release scope and package list.
- Confirm the release version is `1.0.0` for all workspace packages.
- Confirm no breaking API changes were introduced without an RFC.
- Confirm new public APIs have docs and tests.
- Confirm package-boundary architecture changes have an ADR.
- Confirm package versions are aligned with the root version.
- Confirm package dependency direction still matches `docs/package-architecture.md`.
- Confirm `safe-shape` is published after all scoped packages.
- Confirm `docs/integration.md` reflects the intended consumer integration flow.
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

1. Re-run `npm run release:check`.
2. Publish packages in dependency order from `docs/release.md`.

Do not publish unrelated packages.
