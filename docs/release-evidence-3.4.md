# SafeShape 3.4 qualification evidence

**English** | [Русский](ru/release-evidence-3.4.md)

Status: qualified, npm publication blocked by authentication. Owner explicitly authorized checking and publishing 3.4.0. Local qualification and release-source CI passed; registry publication and installation verification remain pending.
Independent developer walkthrough is not performed and is not recorded as passed.
Automated tests and consumer journeys are separate evidence.

## Candidate

Nine packages share version 3.4.0. RFC 0050 and ADR 0038 cover the additive API
workflow; existing core/HTTP API and snapshot defaults remain unchanged.
The pre-existing local edit to docs/implementation-plan-3.1.md is unrelated and
excluded from release commits. Historical 3.3 archives were preserved locally
before generating the new release artifacts.

## Local qualification

`npm run prepare:release` passed on Node 20.10.0 on 2026-10-02: build, workspace release checks, documentation, typecheck, unit tests, examples, benchmarks, installed consumers, quality comparison, migration tests, both dependency audits and package dry runs. Workspace unit tests: 307 passed, zero failures. The API suite passed 18 tests without failures or skips. Both audits reported zero vulnerabilities. Nine release archives were generated. Registry verification remains pending until publication.

## Release-source CI

Commit `248934eac9a4aaac43b3ddcd7fd197fe2a547599` passed the complete release gate on Node 20.10.0 and 24: [CI run](https://github.com/dev-ik/safe_shape/actions/runs/36980783407). The release tag points to this tested commit.

## Publication blocker

The new @safe-shape/api package is absent from npm and requires an authenticated first publication before trusted publishing can be configured. `npm whoami --cache .npm-cache` returned 401 on 2026-10-02. No 3.4.0 packages were published by this qualification run. Registry installation tests cannot run before publication.

## Archive SHA-256

```text
1c53cb02937c971782eb8927908172bdd7f431a3741070c1f0ab7a0f8bbedf8a  safe-shape-3.4.0.tgz
ea3043e8b7e44f14588a19fc074784cf2fd3930c99405d9a909499080ad5ecc7  safe-shape-api-3.4.0.tgz
4b6ffa1a1d0172d050a44a769b0d49b61ca5e24e8950063655e22b32929d5c87  safe-shape-cli-3.4.0.tgz
a0d2a96d2561ca253a3f0716835481a6abefd8912155afe944743f66410f1d78  safe-shape-compat-3.4.0.tgz
b80a3736e5a17b300cb44d3d680ff7d3051f479fa0c77a7ccfd20c4435742a0d  safe-shape-core-3.4.0.tgz
b35a4d21aea7c781a6371c341eb81352a92ba2b570889b8e0d80ffe41d68bbac  safe-shape-http-3.4.0.tgz
770c11657db7fe870863d9306ef69897d0718e0168efb61998c41a4d12bffbe1  safe-shape-json-schema-3.4.0.tgz
0f0345b29d4415b5fccff3c1b1bc3ad2085d9d156e46d3a6c39e14c447c9f710  safe-shape-typescript-3.4.0.tgz
7f03babf215e11eb0b2e086ece05cf69928084c19c62e45ef8f730fa0e8862f8  safe-shape-validation-3.4.0.tgz
```
