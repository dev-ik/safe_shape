# Release Workflow

SafeShape packages are published only after explicit release approval.

## Release Readiness

Run:

```sh
npm run release:check
```

This performs:

- package metadata and boundary checks;
- build;
- typecheck;
- tests;
- runnable example smoke checks;
- benchmark smoke checks;
- consumer tarball installation smoke checks;
- npm audit;
- `npm pack --workspaces --dry-run`.

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
2. `@safe-shape/http`
3. `@safe-shape/json-schema`
4. `@safe-shape/typescript`
5. `@safe-shape/validation`
6. `@safe-shape/cli`
7. `safe-shape`

Use [publish-readiness.md](publish-readiness.md) before publishing packages.

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
