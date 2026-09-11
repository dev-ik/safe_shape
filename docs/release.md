# Release Workflow

SafeShape packages are published only after explicit release approval.

## Release Readiness

Run:

```sh
npm run release:check
```

This performs:

- package metadata and boundary checks;
- local documentation links and EN/RU navigation checks;
- build;
- typecheck;
- tests;
- runnable example smoke checks;
- benchmark smoke checks;
- consumer tarball installation smoke checks;
- npm audit;
- `npm pack --workspaces --dry-run`.

The repository runs the same gate for pushes and pull requests through
`.github/workflows/ci.yml`. Consumer projects can use the provider-neutral
[contract CI guide](ci.md) without adopting SafeShape's release workflow.
Release candidates for 3.0 must also satisfy the
[2.x to 3.0 migration guide](migration-2-to-3.md).

To run the same checks and create publishable archives in
`release-artifacts/`, use:

```sh
npm run prepare:release
```

Use a narrower metadata check during iteration:

```sh
node scripts/release-check.mjs
```

## Versioning

All workspace packages share the root version.

Starting with `1.0.0`, SafeShape follows semantic versioning:

- patch: backward-compatible fixes;
- minor: backward-compatible additions;
- major: breaking public API changes.

## Publish Gate

Do not publish until all are true:

- selected package manifests are intentionally publishable;
- public API docs exist;
- project integration documentation exists;
- tests cover the public API;
- runnable examples pass;
- benchmark smoke checks pass;
- consumer tarball installation passes;
- RFC exists for public capability changes;
- ADR exists for architectural package-boundary changes;
- `npm run release:check` passes.

Publish order must follow dependency direction:

1. `@safe-shape/core`
2. `@safe-shape/compat`
3. `@safe-shape/http`
4. `@safe-shape/json-schema`
5. `@safe-shape/typescript`
6. `@safe-shape/validation`
7. `@safe-shape/cli`
8. `safe-shape`

Use [publish-readiness.md](publish-readiness.md) before publishing packages.

## GitHub Actions Publishing

Releases are published by the `Publish npm packages` workflow. It is started
manually on a Git tag whose name is exactly `v<version>`. The workflow runs the
full release checks, creates deterministic release archives, publishes the
packages in dependency order, and attaches every archive to a GitHub Release.
Before npm publication, it also uploads the archives as a seven-day GitHub
Actions artifact. Publication steps are idempotent: rerunning the tagged
workflow skips package versions already present in npm.

Before using the workflow, create a GitHub Environment named `npm` and
configure an npm trusted publisher for every published package:

```text
GitHub owner/repository: dev-ik/safe_shape
Workflow filename: publish.yml
Environment: npm
Allowed action: npm publish
```

No `NPM_TOKEN` secret is required. The workflow authenticates to npm through
GitHub Actions OIDC.

Prepare and tag a release only after `npm run prepare:release` succeeds:

```sh
git add -A
git commit -m "release: v3.0.0"
git push origin main
git tag -a v3.0.0 -m "Release v3.0.0"
git push origin v3.0.0
```

Then open GitHub Actions, choose `Publish npm packages`, select the release tag,
and run the workflow. The tag/version gate stops the job if the selected ref
does not match the root and workspace package version.

The `compat-only` phase is a recovery path for a tag whose core package was
already published before compat automation was enabled. Run it from the
default branch with `release_ref` set to the exact existing `v<version>` tag.
The workflow checks out that tag, verifies its package version, publishes only
missing core/compat artifacts through trusted publishing, and does not create a
GitHub Release. Normal releases use only the tagged `release` phase.

## Local CLI

Use without global link:

```sh
npm run cli:doctor
```

Create a local global npm link only when needed:

```sh
npm run link:cli
safe-shape --json doctor
```

## Quality Fixture Setup

Before local release checks, install the private quality tooling:

```sh
npm ci --prefix quality --ignore-scripts
```

The full gate runs installed consumer, compiler, browser-bundle, and matched
baseline checks through `npm run quality:check`, and audits its isolated
lockfile. Keep the local `v3.0.0` baseline tag available. CI fetches release tags,
checks Node 20.10.0 and Node 24, and retains the quality JSON report. Local
success does not mark remote CI or the independent developer walkthrough done.
