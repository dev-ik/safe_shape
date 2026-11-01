# SafeShape 4.0.0 local release evidence

**English** | [Русский](ru/release-evidence-4.0.0.md)

Checkpoint: 2026-11-01. Local candidate checks passed; npm publication, remote CI
and a real-agent walkthrough of the new MCP runtime have not been performed.
All ten package versions and exact internal dependencies are 4.0.0.

`npm run release:check` completed successfully on Node v20.10.0, macOS arm64:

- Build, metadata/dependency boundaries, typecheck and 356 workspace tests passed.
- Documentation checks passed for 278 Markdown files before this evidence pair
  was added; documentation-only follow-up changes receive another docs check.
- Runnable examples, benchmark budgets, tarball consumers and an umbrella-only
  install passed. The latter starts both CLI binaries and exercises MCP over stdio.
- Quality fixtures passed all five measurement rounds, installed integrations,
  declaration consumers and candidate/baseline budgets without Zod.
- All three migration tests passed without loading the source library.
- Root and quality npm audits reported zero vulnerabilities; package dry runs passed.

MCP has 27 tests, including initialization, version negotiation, cancellation,
capacity, duplicate IDs, malformed messages, close, split UTF-8 input, output
backpressure and late write errors. The API package has 37 tests, including 19
new OpenAPI comparison cases. Requests and responses are checked in opposite
compatibility directions; unsupported features fail closed into manual review.

`npm ls zod zod-to-json-schema @modelcontextprotocol/sdk --all` at the root and
`npm ls --prefix quality zod --all` are empty. Lockfile and installed-consumer
checks enforce this invariant. Optional peer metadata in third-party tooling is
not an installed dependency. Migration source strings and historical benchmark
documents remain as text; the library is neither installed nor executed.

Local logs: `.tmp/release-4.0.0/release-check.log` and
`.tmp/release-4.0.0/quality-report.json`. The quality report records its source
identity before these documentation-only summaries were added. The final archives
are stored separately in `release-artifacts/4.0.0/` with `SHA256SUMS`; older
release artifacts are preserved. Publication follows the [release workflow](release.md).
