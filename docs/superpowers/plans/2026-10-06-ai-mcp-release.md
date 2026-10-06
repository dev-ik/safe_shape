# SafeShape AI and MCP Implementation Plan

Status: completed; [3.5.0 is published](../../release-3.5.0.md).
This is the original execution record. The initially separate MCP installation
was superseded by [RFC 0052](../../../rfc/0052-umbrella-mcp-entry.md)
and the one-install policy documented in the current [MCP guide](../../mcp.md).

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking. The parent implements this plan; repository exploration and implementation are not delegated.

**Goal:** Ship the local MCP inspection server and validated application-tool adapter together as a backward-compatible 3.5.0 candidate.

**Architecture:** One explicitly installed `@safe-shape/mcp` package reuses core, validation, JSON Schema and compatibility libraries. A fixed operator registry supplies six inspection tools. The application adapter validates both boundaries but the inspection server never runs business handlers.

**Tech Stack:** Existing TypeScript 5.9/Node ESM, Node >=20.10, node:test and official `@modelcontextprotocol/sdk` pinned to 1.32.1. Registry metadata checked on 2026-10-06 reports SDK Node >=18; verify actual installation/build against Node 20.10 before accepting the dependency. SDK transitive Zod is a protocol implementation detail, not a second public schema interface.

**Spec:** [Accepted design](../specs/2026-10-06-ai-mcp-release-design.md).

## Global Constraints

- Existing package APIs, CLI envelopes/exits, snapshot formats and browser graphs remain unchanged.
- Dependency direction: `mcp -> core/validation/json-schema/compat` plus official MCP SDK; the umbrella does not depend on MCP.
- Protocol baseline test: 2025-06-18; advertise only SDK-supported revisions and record tested revisions.
- Stdio only; no HTTP hosting, provider profiles, automatic retries, shell tools or baseline writes.
- Defaults: 1 MiB UTF-8 request, JSON depth 128, 4 MiB serialized response, 16 concurrent operations, 30-second async response deadline.
- Trusted module execution is not sandboxed. Paths resolve beneath an operator-selected real workspace root; tool calls contain IDs and inline JSON only.
- Immutable public wrappers/artifacts/diagnostics; preserve existing payload immutability and native diagnostics.
- Package versions stay 3.4.1 through feature qualification, then synchronize to 3.5.0 before final candidate gates.
- Existing `docs/implementation-plan-3.1.md` changes and `release-artifacts/` contents are not part of task commits. Back up existing archives before the repository's packing script replaces its output directory.
- No push, release tag, registry configuration change or publication without separately authorized release action.

## Review Focus

1. Prototype-sensitive IDs (`__proto__`, `constructor`) resolve as ordinary IDs without affecting the registry prototype; test in Task 1.
2. Accessors, non-enumerable/symbol properties and sparse arrays must not be evaluated/coerced or silently lost during JSON conversion; test in Task 2.
3. A timeout must not release capacity while a callback still runs or allow later handler phases; test in Tasks 2 and 3.
4. Oversized/deep stdio frames must be rejected before SDK parsing can buffer or recurse without bounds; test in Task 4.
5. A published tarball must expose the actual executable and all exact internal dependencies, rather than passing only through workspace symlinks; test in Task 5.

## File map

- `packages/mcp/src/types.ts`, `registry.ts`: public entries/catalog, validation and immutable lookup.
- `packages/mcp/src/json.ts`, `limits.ts`: lossless JSON checks, materialization, capacity/deadline policy.
- `packages/mcp/src/tool.ts`, `handler.ts`: typed application tool, exact definition export, validated handler.
- `packages/mcp/src/inspection.ts`: six tool schemas and library-backed inspection operations.
- `packages/mcp/src/server.ts`: official low-level SDK Server, tools/list and tools/call, explicit lifecycle.
- `packages/mcp/src/manifest.ts`, `stdio.ts`, `cli.ts`: trusted startup configuration, bounded framing and executable.
- `packages/mcp/src/index.ts`: documented exports only.
- `packages/mcp/tests/*.test.ts`, `types.test.ts`: meaningful runtime, protocol, filesystem and inference checks.
- `packages/mcp/package.json`, `tsconfig*.json`: existing package compiler/test conventions.
- `rfc/0051-ai-mcp-contracts.md`, `adr/0039-mcp-package-and-trust-boundary.md`: public and architectural decisions.
- Root package/lock, release/consumer/packing/example scripts and publish workflow: ten-package integration.
- EN/RU MCP guides/API reference/package READMEs, examples and release evidence: usage and qualification.

## Task 1: Decisions, registry and package setup

**Files:** Create RFC/ADR above; `packages/mcp/package.json`, three tsconfigs, `src/types.ts`, `src/registry.ts`, `src/index.ts`, `tests/registry.test.ts`. Modify root `package.json`, `package-lock.json` to add the workspace without changing existing versions.

**Interfaces:** `createMcpContractRegistry(entries: readonly McpContractEntry[], tools?: readonly McpToolCatalogEntry[]): McpContractRegistry`. Entries contain `id`, `description`, `schema`; tool catalog entries contain `id`, `name`, `description`, `inputId`, `outputId`. Registry exposes frozen arrays plus `getContract(id)`/`getTool(id)` over a private copied Map; no mutable Map is exposed. Constructors throw TypeError for invalid developer configuration.

- [x] Write RFC/ADR with Accepted status, public API/type responsibilities and the trusted-code boundary; preserve the design's five function names and six tool names.
- [x] Write registry tests: `rejects duplicate/empty/over-128-character IDs`, `rejects missing catalog references`, `copies entries before freezing`, `supports prototype-sensitive IDs`, `does not invoke schema refinements while registering`.
- [x] Run `npm run test --workspace @safe-shape/mcp`; expect a missing registry implementation/export failure before production implementation.
- [x] Install the pinned SDK and internal dependencies using npm; reproduce existing strict compiler flags and build/test scripts. Implement registry and public types with no registry mutation.
- [x] Run package tests and typecheck; expect passing assertions and no inference/compiler errors. Commit only Task 1 files.

## Task 2: Exact MCP export and application boundary

**Files:** Create `src/json.ts`, `src/limits.ts`, `src/tool.ts`, `src/handler.ts`, `tests/tool.test.ts`, `tests/handler.test.ts`, `tests/json.test.ts`, `tests/types.test.ts`; extend public exports.

**Interfaces:** `defineMcpTool({name, description, input, output})` returns typed immutable metadata. `safeToMcpToolDefinition(tool)` returns `{success:true, definition, warnings}` or `{success:false, issues}`. `createValidatedMcpHandler(tool, handler)` returns an async `(arguments: unknown, context?: {signal?: AbortSignal}) => Promise<CallToolResult>` callback. Handler receives input schema parsed output and `{signal}`; its return type matches output schema accepted input. Export uses input-side and output-side exact graphs respectively. The definition is a JSON-safe MCP object; callbacks are never exported.

- [x] Write tests proving missing APIs fail: invalid arguments yield zero handler calls; valid arguments call once; invalid result/throw never yields success; sync/async refinements and ordered warnings survive; transforms preserve distinct inferred input/output types.
- [x] Add export tests for object roots, recursive references, rejected scalar roots and rejected opaque refinements/outputs with no partial definition. Use existing `safeToJsonSchema` in exact mode, Draft 2020-12.
- [x] Add lossless JSON tests for cycles, bigint, NaN/Infinity, undefined, Date, custom `toJSON`, getters, symbol keys, non-enumerable properties and sparse arrays. Do not invoke accessors or `toJSON` during validation. Own `__proto__` data keys remain valid JSON.
- [x] Run package tests; expect failures for missing boundary/export implementation. Implement the typed tool, JSON descriptor-based inspection and handlers.
- [x] Return successful validated objects in structuredContent plus JSON text; failure diagnostics are text with `isError:true`, never a structured error violating the success schema. Use `_meta['safe-shape/warnings']` with separate `input`/`output` arrays. Unexpected exceptions produce generic messages.
- [x] Add and run deadline/cancellation tests: abort before execution blocks the handler; abort during a phase blocks subsequent phases; deadline suppresses late success; capacity remains charged until execution settles. Use short configured deadlines and controlled promises, not 30-second sleeps.
- [x] Run package tests/typecheck; expect all boundary, serialization and inference fixtures passing. Commit Task 2 files.

## Task 3: Six inspection tools and programmatic server

**Files:** Create `src/inspection.ts`, `src/server.ts`, `tests/inspection.test.ts`, `tests/server.test.ts`; extend `limits.ts` and public exports.

**Interfaces:** `createSafeShapeMcpServer({registry, limits?})` returns official SDK `Server` with explicit `.connect(transport)`/`.close()`. Internal `executeInspection(registry, name, arguments, context)` returns an object envelope `{ok:true, operation, result}` or `{ok:false, operation, error:{code,message,issues?}}`; exported tool output schemas describe both branches. Validate tool arguments with SafeShape, not another public schema library.

- [x] Write six-tool tests: names/descriptions and argument/output schemas; sorted deterministic list with default 20/max 100; unknown IDs and stale cursors; general export defaults input/Draft 2020-12; validation invalidity is `ok:true`; compatibility backward/forward/full and input/output decisions match existing v2 APIs; tool export uses developer-supplied catalog.
- [x] Add tests for rejected unknown flags (`module`, `out`), malicious ID strings, nested union issues, recursive exports, opaque output comparison/manual review and non-JSON parsed results.
- [x] Run package tests; expect missing inspection/server failures. Implement library delegation, SafeShape argument schemas and SDK low-level tools/list/tools/call registration. SDK validates MCP framing; SafeShape validates tool arguments. Unknown tool/malformed arguments are protocol errors; operational errors set `isError:true`.
- [x] Implement exact full serialized CallToolResult byte accounting including text duplication and metadata. Never truncate reports. If the configured limit cannot fit even the minimal error, close the transport rather than transmit an oversized or malformed result.
- [x] Use SDK in-memory linked transports for actual client initialization/list/call/output validation tests; distinguish this from stdio and real-agent evidence. Assert sixteen unresolved calls exhaust default capacity and settling them restores it.
- [x] Run package tests/typecheck; expect correct output schemas, matching structured/text content, unchanged native reports and no unexpected exceptions. Commit Task 3 files.

## Task 4: Startup manifest and bounded stdio executable

**Files:** Create `src/manifest.ts`, `src/stdio.ts`, `src/cli.ts`, `tests/manifest.test.ts`, `tests/stdio.test.ts`; update package bin/build script.

**Interfaces:** Executable syntax `safe-shape-mcp --workspace <root> --manifest <file>`. Manifest `{version:1, contracts:[{id,description,module,export?}], tools?:[{id,name,description,inputId,outputId}], limits?:{requestBytes,depth,responseBytes,concurrency,deadlineMs}}`. No code import occurs before manifest structure and every entry-module realpath have passed checks. Private `loadMcpManifest` returns the validated registry/limits; public package construction remains filesystem-free.

- [x] Write tests for valid default exports, named exports, invalid manifests, duplicate IDs, non-schema exports, absolute and relative escapes, sibling-prefix paths, symlink escapes and missing files. Assert rejected configurations do not import their modules or print raw exception secrets.
- [x] Write actual spawned stdio SDK-client tests for initialize/list/call and clean shutdown. Assert stdout consists only of protocol frames and invalid startup exits nonzero with a generic stderr message.
- [x] Run tests; expect missing manifest/stdio implementation failures. Implement canonical containment and startup validation before connection. Load ESM exports only from the fixed manifest; document trusted transitive imports and import side effects.
- [x] Feed SDK StdioServerTransport through a bounded readable framing stage. Enforce per-frame UTF-8 bytes and nesting before SDK JSON parsing; the structural depth scanner ignores brackets inside quoted/escaped strings. Drop over-limit frames and terminate the session safely, rather than retaining unbounded buffers.
- [x] Add tests for byte limit across chunks, missing newline, quoted braces/escapes, deep frames, malformed JSON, EOF, multibyte UTF-8 and outbound limit enforcement. Use small explicit limits. SDK-supported cancellation must reach the execution context.
- [x] Run package tests on Node 20.10; expect executable mode 0755, no non-protocol stdout and no unhandled rejections. Commit Task 4 files.

## Task 5: Installed consumers, documentation and release integration

**Files:** Modify `scripts/release-check.mjs`, `scripts/consumer-check.mjs`, `scripts/pack-release.mjs`, `scripts/examples-check.mjs`, `scripts/docs-translations.mjs`, `.github/workflows/publish.yml`, `docs/release.md`, `docs/ru/release.md`, docs navigation. Create `docs/mcp.md`, `docs/ru/mcp.md`, `docs/api/mcp.md`, `docs/ru/api/mcp.md`, both packaged MCP READMEs, `examples/mcp-contracts.mjs`, `examples/mcp.manifest.json`, `examples/mcp-workflow.mjs`, `examples/mcp-tool-boundary.mjs`. Update local `.codex/skills/safe-shape/SKILL.md` usage instructions without treating ignored local skill files as published artifacts.

**Interfaces:** Ten workspace packages; MCP depends on four exact-version internal libraries plus SDK 1.32.1. Release-check must distinguish exact internal versions from pinned external dependencies and check MCP executable mode. Existing packages keep exact dependency expectations. Publish MCP after its four internal dependencies, independently of umbrella/CLI. Examples work with installed packages, not relative workspace-only imports.

- [x] Extend installed-consumer assertions first: import all five APIs from tarball, execute MCP bin through SDK client, block an invalid application invocation. Run `npm run consumer:check`; expect missing MCP integration failure before modifying packing/consumer lists.
- [x] Update package/dependency/docs/packing/publication checks, including lockfile and exact SDK validation. Ensure no umbrella source, public entry or browser import graph imports MCP. Test fresh consumer installation resolves SDK dependencies and executable correctly.
- [x] Write EN/RU guides and npm-safe versioned README links, catalog/manifest examples, error semantics, cancellation limitations, trusted modules and coding-agent connection instructions. Add both language guides/API docs to existing translation metadata without weakening reviewed-source checks.
- [x] Register both runnable examples in examples-check and consumer-check. Example workflow performs list -> export -> invalid -> corrected -> compare; application example asserts zero handler calls for invalid arguments and no success for invalid output.
- [x] Run `node scripts/release-check.mjs`, `npm run docs:check`, `npm run examples:check`, `npm run consumer:check`, `npm run typecheck` and package tests; expect ten-package metadata, translation coverage and installed-consumer success. Commit Task 5 files.

## Task 6: Candidate qualification and final review

**Files:** Create `docs/release-evidence-3.5.md` and EN/RU release notes. Modify root/workspace versions and exact internal dependency versions/lockfile only after initial feature gates pass; update stable/preparing README status and versioned package links. Do not publish.

**Interfaces:** A locally qualified candidate is distinct from a published release or configured npm trusted publisher. Record every actual check/client/SDK/protocol version and any remaining human/external prerequisites.

- [x] Run initial build, typecheck, all workspace tests, docs/examples, benchmarks, consumer, quality, migration and audit checks. Capture complete outputs under `.tmp/release-3.5/`; read final statuses and investigate failures before versioning.
- [x] Perform an actual coding-agent walkthrough using its supported local MCP connection, without changing global client settings automatically. If this environment cannot connect a real agent, record this acceptance item as unverified; SDK smoke tests do not satisfy it. Do not claim release readiness while this item remains open.
- [x] Review source changes against the spec, dependency directions, inference, error disclosure, serialization, cancellation and realpath containment. Preserve the user's existing changes. Record any necessary deviations and consequences in the execution ledger.
- [x] Synchronize all ten packages and root to 3.5.0, maintain exact internal versions, update current docs/links and rerun `npm run prepare:release` on the final candidate. Before packing, preserve existing release artifacts in a separate `.tmp/release-3.5/previous-artifacts/` backup; the packing script replaces its output directory.
- [x] Check ten archives, SHA256SUMS and installed consumer against the final version; append evidence with exit codes and tested protocol revisions. Remote provenance setup is an external prerequisite, not silently marked complete.
- [x] Commit scoped implementation/evidence changes after passing verification. Report changed files, check results, limitations and release prerequisites. No tag/push/publication in this task.

## Plan self-review

Every spec section maps to Tasks 1-6. Registry/tool types in Tasks 2-4 consume
Task 1's explicit catalog; no arbitrary module path is exposed to agents. Lossless
JSON/error materialization is shared by application and inspection boundaries.
SDK-in-memory, SDK-stdio and actual-agent evidence are separate acceptance items.
All five review-focus cases have owning tests. Candidate qualification preserves
existing archives before the repository's destructive output-directory refresh.

The implementation method is parent-only in the existing workspace, preserving
unrelated changes. This plan does not require a new exploratory subagent or a
new architecture/package manager. The user approved written-plan execution; all tasks have been implemented and
the final local candidate has passed qualification. Publication remains separate.
