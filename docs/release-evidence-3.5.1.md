# SafeShape 3.5.1 release evidence

**English** | [Русский](ru/release-evidence-3.5.1.md)

Documentation patch; publication status is recorded in the
[GitHub release](https://github.com/dev-ik/safe_shape/releases/tag/v3.5.1).
This versioned file records the qualification checkpoint. Post-publication
registry checks are recorded in the current branch and workflow results.

## Documentation verification

The preceding documentation audit passed local links and translation review,
Markdown anchors, package metadata and executable examples. A TypeScript
quick-start consumer compiled and exercised schema export, type generation,
snapshot and compatibility commands against installed 3.5.0. The corrected
MCP schema/manifest exercised all six tools through the official SDK. CLI, MCP
and umbrella test archives contained both reviewed README files unchanged.

For 3.5.1, all ten versions and exact internal dependencies are synchronized.
Package README links target `v3.5.1`. Existing release artifacts were preserved
under `.tmp/release-3.5.1/previous-artifacts/` before the new qualification gate.

## Versioned local qualification

`npm run prepare:release` passed on Node 20.10.0 on 2026-10-06: build, metadata,
266 Markdown files, typecheck, 329 workspace tests, examples, benchmarks,
installed consumers including umbrella-only MCP, quality/migration, both audits
with zero vulnerabilities, pack checks and ten archives. All SHA256SUMS passed.
Both README files in every archive match the reviewed source and use `v3.5.1` links.
All 76 packaged runtime JavaScript/declaration files are byte-identical to 3.5.0.
The version-neutral README status wording passed a failing-then-passing docs gate;
the checker still requires the exact root package version in both languages.
Log: `.tmp/release-3.5.1/prepare-release.log`.
