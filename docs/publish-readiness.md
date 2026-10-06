# Publish Readiness

**English** | [Русский](ru/publish-readiness.md)

SafeShape packages are published only after explicit release approval. Use this
checklist before running the trusted-publishing workflow.

## Pre-Approval Checklist

- Confirm the release scope and package list.
- Confirm all workspace packages use the intended release version.
- Confirm no breaking API changes were introduced without an RFC.
- Confirm new public APIs have docs and tests.
- Confirm current guides and all packaged READMEs have reviewed Russian counterparts.
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
- Review current README, documentation navigation and release notes for the
  intended version and status. `docs:check` validates structure and reviewed
  hashes; it does not prove that a release has actually been published.
- Move earlier "New in" sections into the release history rather than presenting
  old features as the latest release.
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

## MCP package (3.5.0)

Include `@safe-shape/mcp` in the ten-package release and configure its npm trusted
publisher for the same repository/workflow/environment. Consumer checks exercise
the installed MCP executable and validated tool adapter as well as the CLI.
`prepare:release` generates ten archives and SHA256SUMS. Record the actual
coding-agent walkthrough separately from SDK-only tests; see [MCP](mcp.md).

## Post-Publication Verification

- Wait until every intended version and `latest` tag is visible in npm. Publish-time
  scanning can delay installation after `npm publish` reports success.
- Install only `safe-shape@<version>` in a new consumer and check root/MCP imports,
  handlers and both CLI binaries.
- Download GitHub Release assets and verify SHA256SUMS.
- Update EN/RU project status, documentation index, roadmap, release notes,
  release history and the current summary of release evidence together.
- Keep dated pre-publication evidence as history, with explicit checkpoint labels.
- Record which versions have provenance and any manual first-publication exception.

Published npm name/version pairs cannot be replaced. Corrections to packaged
READMEs, including their version-pinned links, require a new patch version;
editing `main` does not update an installed archive or the previous release tag.
