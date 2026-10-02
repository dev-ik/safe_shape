# SafeShape 3.4 qualification evidence

**English** | [Русский](ru/release-evidence-3.4.md)

Status: candidate, publication pending. Owner explicitly authorized checking and
publishing 3.4.0. Local gate, final commit CI, archive hashes and registry install
verification will be recorded here as they finish; none is assumed complete.
Independent developer walkthrough is not performed and is not recorded as passed.
Automated tests and consumer journeys are separate evidence.

## Candidate

Nine packages share version 3.4.0. RFC 0050 and ADR 0038 cover the additive API
workflow; existing core/HTTP API and snapshot defaults remain unchanged.
The pre-existing local edit to docs/implementation-plan-3.1.md is unrelated and
excluded from release commits. Historical 3.3 archives were preserved locally
before generating the new release artifacts.

## Local qualification

`npm run prepare:release` passed on Node 20.10.0 on 2026-10-02: build, workspace release checks, documentation, typecheck, unit tests, examples, benchmarks, installed consumers, quality comparison, migration tests, both dependency audits and package dry runs. Workspace unit tests: 307 passed, zero failures. The API suite passed 18 tests without failures or skips. Both audits reported zero vulnerabilities. Nine release archives were generated. Final commit CI and registry verification remain pending.
