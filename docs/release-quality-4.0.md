# Release quality for 4.0

**English** | [Русский](ru/release-quality-4.0.md)

This document supersedes the competitor dependency requirements in the
[3.1 quality contract](release-quality-3.1.md). Its runtime, diagnostic, typing,
compatibility, installed-consumer and measured regression requirements continue
to apply. Historical evidence is not evidence for a changed 4.0 candidate.

Run `npm run release:check` after installing the root and quality lockfiles.
The gate includes build, metadata, dependency independence, EN/RU documentation,
typecheck, workspace tests, runnable examples, benchmark budgets, installed
consumers, quality fixtures, migration tests, both audits and package dry runs.
Root and quality dependency trees, including installed release consumers, must
contain neither Zod nor the official MCP SDK. Migration source fixtures are parsed
as text and only their converted SafeShape output is executed.

The quality harness compares candidate and SafeShape 3.1.0 artifacts. It retains
five isolated samples, alternating order, raw measurements and the established
20% timing/25% heap budgets; new feature workloads retain their absolute budgets.
It does not run competitor comparisons. See [benchmark methodology](../quality/README.md).

4.0 acceptance additionally covers direct YAML/JSON OpenAPI comparison, request
and response direction, unsupported-feature diagnostics, recursive refs and bounded
import; MCP initialization, cancellation, duplicate IDs, capacity, shutdown,
framing and output backpressure; and migration from the former SDK return type.
Every new public API has reference documentation and tests. All package versions
and internal dependencies must agree, with RFC/ADR records for contract changes.

Keep local checks, remote Node-version CI, real-agent MCP walkthrough and publication
as separate evidence. A wire test does not establish behavior in every agent.
Archive checksums and publication/registry verification follow the [release process](release.md).
