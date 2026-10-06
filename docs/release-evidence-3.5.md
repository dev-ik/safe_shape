# SafeShape 3.5.0 release evidence

**English** | [Русский](ru/release-evidence-3.5.md)

Status: final local 3.5.0 candidate qualified; not published.

## Recorded checks

On 2026-10-06, the initial full `npm run release:check` passed on Node 20.10.0,
including build/typecheck, metadata/docs, workspace tests, examples, benchmarks,
installed consumers, quality/migration checks, both audits and pack dry-run.
This initial run used pre-version package metadata and does not substitute for
final 3.5.0 candidate qualification.

The subsequent focused MCP suite passed 19/19, including five independently
reviewed boundary fixes, typed inference fixtures, actual SDK stdio and explicit
MCP revision 2025-06-18 initialization/list/call. SDK 1.32.1 client tests use its
2025-11-25 negotiated revision; newer SDK-supported revisions are not implied.

A real Codex CLI 0.159.0 read-only walkthrough completed six MCP calls: discovery,
export, invalid validation, corrected validation, backward/input comparison and
tool-definition export. No global client configuration was changed. Its original
trace is `.tmp/mcp-agent-events.jsonl`; final-candidate trace is recorded under
`.tmp/release-3.5/agent-events.jsonl`.

## Review and remaining qualification

Independent read-only review found five Important issues and no Critical issues.
Each finding received a failing regression before the fix: recursive object
roots rejected by the SDK, additional payload freezing, synchronous phase
continuation after deadline, ignored configured depth and throwing safe export.
All six regression cases (separate application/server depth cases) now pass.
Trusted callbacks/transitive imports remain the explicitly accepted boundary.

Final `npm run prepare:release` passed with exit 0 on Node 20.10.0: build,
metadata/docs, typecheck, 326 workspace tests (19 MCP), examples, benchmark runner
and budgets, installed consumers, quality fixtures, migration tests, both audits
with zero vulnerabilities and pack checks. The final candidate produced ten
3.5.0 archives. Every SHA256SUMS entry was independently recomputed; archive
manifests/internal dependency versions and MCP executable mode 0755 were verified.
`cli:doctor` reports 3.5.0 and success.

The final real-agent trace confirms all six requested MCP calls completed without
errors on the 3.5.0 candidate: invalid data false with path `["name"]`, corrected
data true and migration decision compatible. Post-qualification evidence/status
updates passed `docs:check` (259 Markdown files) and whitespace checks; these
updates do not change packaged runtime files. Raw gate logs live in
`.tmp/release-3.5/final-prepare-release.log`; SHA256SUMS is in `release-artifacts/`.
Existing archives were preserved in `.tmp/release-3.5/previous-artifacts/` before
packing.

No remote CI, npm publisher configuration, release tag, push or publication has
been performed. Configure the new package's npm trusted publisher and run the
remote versioned gate before authorized publication. Local review/tests do not
assert compatibility with untested clients.

## Documentation follow-up

A documentation audit found missing MCP entries in package/navigation/integration
guides and stale 3.4.1 wording in the umbrella npm README. These were corrected
in English and Russian, including explicit separate MCP installation, API
exports, package boundaries and trusted-publisher readiness. Translation source
hashes were reviewed and refreshed. `docs:check` passes for the current 258
Markdown files; the earlier 259 count included the temporary execution ledger.

All ten archives and SHA256SUMS were rebuilt. `consumer:check` passed with the
installed MCP executable and adapter. Every archive's runtime files and package
manifest were compared byte-for-byte with the qualified candidate and remained
identical; only documentation changed. Full runtime tests were not repeated for
this documentation-only update. Prior candidate archives are preserved under
`.tmp/release-3.5/docs-refresh-previous-artifacts/`.

## One-install umbrella MCP revision

The user approved `safe-shape/mcp` before publication. RFC 0052/ADR 0040 replace
the initial separate-install requirement: umbrella installs MCP/SDK transitively,
but its main import does not load them. The dedicated package remains available.

An isolated consumer installed only the umbrella archive using localhost scoped
metadata for unpublished dependencies. Its only direct dependency is safe-shape;
MCP APIs, the executable, validated adapter and SDK-client workflow passed.
A loader test forbids MCP/SDK resolution during root import. Subpath type fixtures
preserve transformed input/output inference.

The subsequent full `prepare:release` passed: 329 workspace tests, EN/RU docs,
examples, benchmarks, installed consumers, quality/migration, both audits with
zero vulnerabilities and ten rebuilt archives. SHA256SUMS and the packaged
subpath/dependency/declaration files were verified. Current docs checks cover
260 Markdown files. Log: `.tmp/release-3.5/umbrella-prepare-release.log`.

Review found a Zod collision in the generated quality consumer after adding the
SDK. EEXIST was reproduced; setup now replaces only that temporary directory
with the benchmark's pinned Zod 4.6.1. The full quality gate and actual pinned
version passed verification. Production dependency versions were not changed.
Prior archives are in `.tmp/release-3.5/umbrella-previous-artifacts/`.
This install workflow was verified with npm; other package managers are untested.
