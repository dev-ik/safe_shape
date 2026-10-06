# SafeShape 3.5.0: AI contracts and MCP

Date: 2026-10-06.
Status: specification and parent-executed implementation plan accepted; implementation completed, final local 3.5.0 candidate qualified.
This document proposes a backward-compatible minor release. Package versions
remain 3.4.1 until release qualification. No publication is authorized by design
approval.

## 1. Purpose and success

Deliver both requested scenarios in one release:

1. Coding agents discover SafeShape contracts, export schemas, validate JSON and
   assess contract changes through a local MCP server.
2. Applications define MCP tools with SafeShape input/output contracts, validate
   arguments before executing a handler and validate its result before reporting
   success.

The complete demonstration is discovery -> schema export -> invalid validation
report -> corrected validation -> compatibility report. A separate application
example demonstrates blocked invalid arguments and blocked invalid output.

The MCP server and application adapter ship together. There is no intermediate
AI-only release. Provider-specific OpenAI/Gemini profiles and remote HTTP hosting
are outside 3.5.0.

## 2. Approach and package boundaries

Add one package, `@safe-shape/mcp`, with a Node ESM server executable
`safe-shape-mcp` and a programmatic public entry. Retain Node >=20.10 support.

Dependency direction is `mcp -> core/validation/json-schema/compat` plus the
official MCP TypeScript SDK for protocol transport. Core and existing tooling packages do not
depend on MCP; umbrella declares an exact-version MCP dependency. In particular, the umbrella installs MCP and its SDK transitively; only its `./mcp` subpath
re-exports MCP, leaving its main import graph unchanged. No alternative schema library
is introduced as SafeShape's public contract interface. Any SDK-required
dependencies remain implementation details.

CLI and MCP reuse existing domain libraries, rather than launching the CLI as a
subprocess or importing its executable. CLI flags, JSON envelopes, exit codes,
existing packages and browser import graphs remain compatible. Shared MCP
definition export is accessible programmatically; additional CLI commands are
not required for the first release.

The baseline interoperability test uses MCP protocol revision 2025-06-18 and
stdio. The implementation plan selects an exact official SDK version compatible
with the repository's Node/TypeScript requirements. Advertise only protocol
revisions actually supported by that SDK, and record tested revisions in release
evidence; support for a newer revision is not inferred from the baseline test.

## 3. Public API responsibilities

The proposed public functions are:

- `createMcpContractRegistry(entries, tools?)`: validates and freezes an explicit map of
  contract IDs to schemas and human-authored descriptions. It performs no file
  discovery. IDs are non-empty, unique strings of at most 128 characters.
- `createSafeShapeMcpServer({ registry, limits })`: constructs the six inspection
  tools described below. Connection/startup is explicit and separate from
  construction; it does not register application business handlers implicitly.
- `defineMcpTool({ name, description, input, output })`: stores immutable
  SafeShape contracts and metadata, preserving input/output type inference.
- `safeToMcpToolDefinition(tool)`: returns an immutable discriminated export
  result with a protocol definition or structured issues, never a partial
  definition. Export requires exactly representable wire schemas.
- `createValidatedMcpHandler(tool, handler)`: creates a protocol handler that
  validates incoming arguments and outgoing results and materializes safe MCP
  results. The application chooses where to register it and owns side effects.

Handler arguments use the input schema's parsed output type. Handler return
values must be accepted by the output schema's input type; successful wire
results use its parsed output type. Compile-time fixtures verify these separate
types, including transforms. Do not conflate schema input and output types.

Public wrappers, registry entries, exported artifacts and diagnostic containers
are immutable. Application payloads retain existing core immutability semantics;
this package does not recursively freeze business data.

## 4. Inspection tools exposed to coding agents

| Name | Arguments | Result |
| --- | --- | --- |
| `list_contracts` | Optional opaque `cursor`, `limit` (default 20, maximum 100) | Ordered IDs/descriptions and optional next cursor |
| `describe_contract` | `contractId` | Contract IR v2 input/output description, annotations and supported operations |
| `export_json_schema` | `contractId`, `side` (default input), `target` (draft-2020-12 or draft-07; default draft-2020-12) | Exact JSON Schema plus export warnings, or export issues |
| `validate_data` | `contractId`, inline JSON `value` | Existing async-capable validation report: valid/data or invalid/issues, plus warnings |
| `compare_contracts` | `previousId`, `nextId`, `mode` (backward/forward/full; default backward), `side` (input/output; default input) | Existing v2 compatibility proof and migration diagnostics |
| `export_tool_definition` | `toolId` from the startup-configured tool catalog | MCP name/description/inputSchema/outputSchema, or export issues |

The registry has a separate explicit tool catalog referencing registered input
and output contract IDs. Names/descriptions are supplied by the developer, not
generated from payload contents. Contract and tool IDs are distinct namespaces.
The programmatic registry constructor accepts this catalog as an optional second
argument. An empty tool catalog is valid; export reports `unknown_tool_id`.

Lists are sorted lexicographically by ID. Pagination is deterministic for the
fixed startup registry; invalid or stale cursors produce a structured error.
There is no runtime registry mutation, hot reload or call-order dependence.

`validate_data` always evaluates a schema's accepted runtime input. Its result
is the parsed output, so transforms and stripping are not silently discarded.
Inspecting the schema's output graph is a separate operation; `side: output`
does not mean reusing the original schema as an output validator.

Comparison uses existing ContractSnapshotV2 constructors and comparisons.
Backward proves previous values are accepted by next; forward reverses that;
full requires both. Breaking, risky and unknown results never become compatible.
No operation overwrites baselines or creates a compatibility proof by sampling.

## 5. Application tool boundary and MCP profile

The handler pipeline is:

1. Validate arguments with the tool's input schema using async-capable parsing.
2. If invalid, return an argument-validation error and do not call the handler.
3. Call the handler once with parsed arguments; there is no automatic retry.
4. Validate the handler result with the output schema, including async rules.
5. Verify the parsed result is losslessly representable as JSON and fits limits.
6. Return the validated result only after every preceding step succeeds.

Export `inputSchema` from the input contract's input graph and `outputSchema`
from the output contract's output graph. The baseline MCP profile requires
object-root schemas and object-shaped successful structured results. Other root
types produce explicit profile diagnostics. General JSON Schema export remains
available for other root types through `export_json_schema`.

Opaque refinements and opaque transformed outputs that cannot be represented
exactly produce existing export diagnostics or MCP profile diagnostics. Do not
drop refinements, invent output bounds or change required/null semantics.
Runtime validation remains authoritative even after successful schema export.

The export adapter is separate from handler construction: a tool with runtime
rules may be validated locally, but cannot be advertised by this package unless
its definition exports successfully. The documented registration example checks
export before exposing a handler. Annotations claiming read-only/idempotent
behavior are never inferred for application business handlers.

## 6. Response and error semantics

Inspection tools use a stable object envelope with `ok`, `operation` and exactly
one of `result` or `error`. Errors contain a stable `code`, safe message and
structured diagnostics where available. `ok` means the inspection operation
completed: invalid data is `ok: true` with `result.valid: false`; an incompatible
comparison is also a completed report. Application tool argument/result failures
are execution errors with `isError: true`.

Return inspection envelopes in `structuredContent` with the same serialized
JSON in text content, and publish matching output schemas. Preserve native
issue codes, paths, nested union branches, warning order and migration decisions.
Use `isError: true` for operational failures such as unknown IDs, unsupported
export, serialization failure or exhausted capacity. Malformed MCP requests
remain protocol errors handled according to the negotiated protocol/SDK.

Successful application handlers return their validated object directly in
`structuredContent`, matching the advertised output schema, and JSON text.
Their execution errors use safe diagnostic text and `isError: true`; they do
not put an error envelope into structuredContent that violates that tool's
success output schema. Preserve input/output warnings in documented namespaced
metadata, separate from the successful payload.

Reject non-finite numbers, undefined, bigint, functions, symbols, cycles and
non-plain runtime values whose JSON serialization changes their meaning.
Never silently use JSON.stringify coercion as validation. Diagnostic conversion
must also reject unrepresentable native expected-values safely. Handler/import
exceptions yield generic public errors; stack traces, raw exception messages and
payloads are not automatically logged. Diagnostics returned to an authorized
caller are data and can contain sensitive developer-authored content.

## 7. Configuration and trust boundaries

The executable receives one explicitly selected local JSON manifest at startup.
The manifest has a version field, contract entries with ID/description/module/
export (default `default`), a tool catalog and optional limits. The workspace
root is supplied by the operator; relative manifest/module paths resolve beneath
it. Resolve real paths and verify containment, including symlink targets, before
import. Reject duplicate IDs, invalid schemas and unresolved tool references
before opening the transport. No automatic filesystem search takes place.

Tool calls accept IDs and inline JSON only. They cannot provide module paths,
URLs, shell commands, output paths or registry replacement. Client-provided
roots do not expand operator configuration. There are no filesystem-writing or
baseline-mutating inspection tools. Stdio stdout carries protocol messages only;
diagnostic logging, if enabled, uses stderr without payloads.

Imported modules, refinements and transforms execute trusted JavaScript with
the process's permissions, including possible network/file side effects.
Path containment restricts selected entry modules, not their transitive imports
or behavior. This is not a sandbox. Run only developer-approved modules; hostile
code isolation requires a separate design. The inspection server does not execute
registered application business handlers.

Default limits: 1 MiB UTF-8 request, JSON nesting depth 128, 4 MiB serialized
response, 16 concurrent operations, and a 30-second async response deadline.
Limits are positive, finite operator configuration; tools cannot override them.
Reject excess concurrency without an unbounded queue. Over-limit responses yield
a bounded diagnostic, not a truncated artifact or report.

Cancellation/deadlines are cooperative. Check them before entering subsequent
validation/handler phases and suppress late successful responses. Keep in-flight
capacity charged until already-running callbacks settle. Synchronous callbacks
can block the event loop and async callbacks may never settle; the server cannot
promise hard termination or rollback. Forward an AbortSignal to application
handlers where supported, without implying custom schema callbacks observe it.

## 8. Alternatives and scope decisions

A thin CLI subprocess wrapper would duplicate argument parsing and permit
arbitrary executable module paths. A remote server would additionally require
authentication, tenant isolation and transport authorization. Reuse domain
libraries with a fixed local registry for this release.

Do not add a general agent orchestrator, LLM provider client, autonomous repair,
sampling, automatic tool execution, shell execution or generated business
handlers. Resources/prompts and TypeScript generation over MCP can be added
later without blocking the six-tool discovery/validation workflow.

## 9. Required implementation artifacts and edit sequence

Implementation planning must preserve this sequence:

1. New public capability RFC under `rfc/` and package/trust-boundary ADR under
   `adr/`, using the next available numbers at implementation time.
2. `packages/mcp/` public types, registry, exact JSON/profile export and
   application boundary, with inference and focused behavior tests.
3. Six inspection tool handlers using existing validation/export/compat APIs.
4. Stdio executable, manifest parsing, limits and protocol integration tests.
5. Workspace/package lock, build/release metadata, consumer installation checks,
   package boundaries and publication ordering including the umbrella MCP subpath.
6. English/Russian guides and packaged READMEs, examples and local skill updates.
7. Full candidate qualification, version synchronization to 3.5.0 and rebuilt
   archives. Version changes do not precede feature qualification.

Do not include existing edits to `docs/implementation-plan-3.1.md` or existing
`release-artifacts/` contents in the implementation scope or design commit.
Actual file-level tasks and test commands are specified by the subsequent
implementation plan, after written-spec approval.

## 10. Acceptance and release gates

- Public API tests cover sync/async validation, transforms, warnings, opaque
  exports, recursion, JSON representability and inference without core changes.
- Invalid arguments cause zero handler calls. Valid arguments cause one call.
  Invalid results and handler exceptions never produce a successful response.
- Every inspection tool has success, domain-report and operational-error tests
  where applicable. Proof direction and manual-review outcomes are preserved.
- Test realpath escapes/symlinks, unknown IDs, duplicate catalog entries,
  protocol-only stdout, malformed requests, capacity/size limits and cooperative
  cancellation without claiming hard callback termination.
- SDK client/server stdio tests exercise initialization, tools/list, tools/call
  and output-schema conformance. Record exact SDK and protocol revisions.
- An actual coding-agent walkthrough demonstrates discovery, correction and
  comparison. Record the client/version and distinguish observed execution from
  mocked or SDK-only tests. No unsupported client compatibility claims.
- Run relevant package tests, docs/typecheck/build, examples, consumer checks,
  benchmarks and complete `npm run prepare:release` on the final candidate.
- Integrate the new package into publication and provenance configuration.
  Existing APIs, CLI output, snapshot formats and browser graphs remain stable.
- Publish only after separate explicit release approval under the existing
  release workflow. No release tags or publishing are part of this design step.

## References

- [SafeShape release workflow](../../release.md)
- [MCP tools, baseline revision 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/server/tools)
- [MCP transports, baseline revision 2025-06-18](https://modelcontextprotocol.io/specification/2025-06-18/basic/transports)

Packaging revision: the user approved one-install MCP via `safe-shape/mcp` before
publication. RFC 0052 and ADR 0040 supersede the initial separate-install policy.
