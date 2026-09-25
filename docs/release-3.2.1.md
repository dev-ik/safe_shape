# SafeShape 3.2.1 documentation patch

Status: published on 2026-09-25. All eight npm packages use `latest: 3.2.1`,
and registry README contents match the corrected repository files.

This patch publishes corrected package READMEs to npm. All eight packages,
their exact internal dependencies and the workspace lockfile use 3.2.1.
Runtime implementation, public API and dependencies outside the workspace
are unchanged from 3.2.0; the release checks verify the packaged output.

## Documentation changes

- Mark object composition, checked pipelines, recursive TypeScript declarations
  and producer/consumer connection checks as available since 3.2.0.
- Describe sync/async Standard Schema validation and custom diagnostic APIs
  consistently with the runtime.
- Fix English/Russian quick starts: export a quiet schema module, keep example
  logging in the application and create the snapshot output directory.
- Correct release metrics, benchmark budgets and the quality baseline; retain
  historical measurements as historical evidence.
- Expand package READMEs and point to current API and production-boundary guides.

Upgrade all installed `safe-shape` and `@safe-shape/*` packages together. This
patch adds no schema, snapshot or application migration requirement. The
[3.2.0 release record](release-candidate-3.2.0.md) describes the runtime features
and their limits. Its independent human walkthrough exception remains recorded;
automated documentation checks are not a new human walkthrough.

## Verification and publication

Signed tag `v3.2.1` points to `74ce3624f6c5e48d41ee7af535098c8d9b9dac07`.

- The local full `prepare:release` gate passed on Node 20.10.0: 274 package tests,
  type checks, examples, 29 benchmark scenarios, installed consumers, migration
  tests, unchanged quality budgets and both zero-vulnerability audits.
- [Exact-candidate CI](https://github.com/dev-ik/safe_shape/actions/runs/36140635166) passed on Node 20.10.0 and Node 24. Both jobs'
  tested archives match the locally qualified tarballs.
- Archive comparison with published 3.2.0 found identical JavaScript, type
  declarations, source maps and file modes across all eight packages. Only
  `package.json` version/internal-dependency fields and five READMEs differ.
- The [publishing workflow](https://github.com/dev-ik/safe_shape/actions/runs/36141845086) repeated `prepare:release`,
  published all eight packages through npm trusted publishing and created
  [SafeShape v3.2.1](https://github.com/dev-ik/safe_shape/releases/tag/v3.2.1).
- npm version, `latest`, SHA-512 integrity, downloaded tarball bytes and every
  registry README match the qualified release. All eight GitHub release assets
  match the same archives.
- A fresh project installed all eight packages from npm with a clean cache.
  Imports, CLI doctor, connection checks, recursive declarations and inference
  passed, including compilation with TypeScript 5.9.2 and 7.0.2. Five HTTP
  requests covered invalid JSON/input, service/response failures and successful
  processing afterwards, with rejecting loggers contained.

Verification records remain under `.tmp/readiness-3.2.1/`. The 3.2.0 tag and
archives are unchanged.

Final published archive SHA-256 values:

- `safe-shape-3.2.1.tgz`: `af3f20f5220ecbf13d757233d22fac83f34f9970b64d1cac0d41886f7e27fc67`
- `safe-shape-cli-3.2.1.tgz`: `39cb1db3d30936bd24b889943f7fd1edb908505c9c6a567301222dc79cf0aaa3`
- `safe-shape-compat-3.2.1.tgz`: `d422c52668008aee8d7f8d63d9b25790593d35789108b22855a93a819fa8fcc2`
- `safe-shape-core-3.2.1.tgz`: `abcd3457852cdef9b6048e37081513e43ddbbcd1e6c12d63a553d3a3981622dd`
- `safe-shape-http-3.2.1.tgz`: `b44466cff798a8f63fbeb2a396d92c7a0fe260cfb490a2d121b4f0e8af85daef`
- `safe-shape-json-schema-3.2.1.tgz`: `0bebacf8d3b460c5126b62d2efe752aca4e1167a36ed0a20714df1537e5d13a4`
- `safe-shape-typescript-3.2.1.tgz`: `a89f53dbad1d34651f51d012506f223060ab1717e7e34c5f7f9e81cbe32de276`
- `safe-shape-validation-3.2.1.tgz`: `4f8b35f3b0e996bc932c94b90481bdd42e81f2654276d7ab8afb0463a2638ab6`
