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
