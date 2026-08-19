# SafeShape Roadmap

Status: proposed

Last updated: 2026-08-19

SafeShape `2.0.0` established the runtime contract platform: input/output
Contract IR, recursive snapshots, compatibility analysis, Standard Schema,
and addressable synchronous custom diagnostics. The next releases should make
those diagnostics easier to consume without changing their meaning.

The accepted and completed 2.0 plan remains available in
[roadmap-2.0.md](roadmap-2.0.md).

## Version Strategy

The recommended sequence is:

1. `2.1`: form-oriented issue projection, externally supplied formatting, and
   production response recovery.
2. `2.2` candidate: asynchronous parsing and refinements, if the RFC proves
   that the existing synchronous contract remains intact.
3. `3.0`: Diagnostics v2, including non-fatal warnings and structured custom
   diagnostic parameters.

This sequence delivers the low-risk consumer-facing improvements first and
keeps result-model changes in one deliberate major release. A `2.2` release is
optional: async parsing must move to 3.0 if it cannot be introduced without
changing existing synchronous behavior or types.

## SafeShape 2.1: Form-Ready Diagnostics and Response Recovery

### Goal

Make native SafeShape issues directly usable by form and UI layers while
preserving the current `Issue`, `ValidationError`, and `ParseResult` models.
Formalize production response recovery so deployed response drift can produce
a typed valid, recovered, or unavailable state without weakening validation.

The release should remain framework-neutral. It should not add React, Vue, or
form-library dependencies.

### Proposed Public Surface

The exact types require an accepted RFC. The intended capabilities are:

- `groupIssuesByPath(issues)` groups issues by their exact native path without
  losing issue objects or their declaration order;
- `toFieldErrors(issues, options?)` projects issues to a form-friendly,
  immutable field-error record;
- formatting helpers accept an external formatter per call, with the current
  English output retained as the default;
- the same helpers are exported from `@safe-shape/core` and the `safe-shape`
  umbrella package;
- a framework-neutral response recovery capability builds on
  `safeParseHttpResponse()`, validates fallback data through the same contract,
  and is exported from `@safe-shape/http` and the umbrella package.

A candidate shape for discussion is:

```ts
interface IssueGroup {
  readonly path: readonly IssuePathSegment[];
  readonly issues: readonly Issue[];
}

type IssueMessageFormatter = (issue: Issue) => string;

groupIssuesByPath(issues: readonly Issue[]): readonly IssueGroup[];

toFieldErrors(issues: readonly Issue[], options?: {
  readonly formatMessage?: IssueMessageFormatter;
  readonly formatPath?: (path: readonly IssuePathSegment[]) => string;
  readonly rootKey?: string;
}): Readonly<Record<string, readonly string[]>>;
```

This sketch is not yet a compatibility commitment. In particular, the RFC
must settle field-path syntax and the behavior of ordinary-union branch trees.

### Required Semantics

- Preserve first-seen path order and issue order within each group.
- Group by structural path equality, not by a lossy joined string.
- Copy and freeze returned groups, paths, arrays, option-derived output, and
  records according to existing immutability rules.
- Preserve every issue at a field; never overwrite an earlier message.
- Define an explicit root-error key.
- Detect or avoid field-key collisions introduced by a custom path formatter.
- Do not choose a "best" ordinary-union branch or flatten branch diagnostics
  implicitly. Branch projection must be explicit if it is supported.
- Keep current formatting byte-for-byte compatible when no external formatter
  is supplied.
- Keep formatter state external. Schemas must not carry a locale, translation
  registry, or mutable global formatter.

### Localization Boundary

SafeShape 2.1 can provide a reliable presentation hook: applications may
render an issue in any language and `toFieldErrors()` may use that formatter.
Custom refinement messages remain application-owned.

This is not yet a fully semantic message-catalog API. Current issues expose
constraint details partly through strings such as `expected`; a formatter
cannot always reconstruct every native constraint as typed interpolation data.
Complete, stable localization belongs with structured diagnostic parameters in
3.0. The 2.1 documentation must state this limitation rather than promise more
than the result model can represent.

### Production Response Recovery Boundary

SafeShape 2.1 should formalize the existing application-owned recovery pattern
without turning cache, retry, telemetry, or UI policy into schema behavior. The
RFC must settle the exact API and result type before implementation.

The accepted design must:

- return an explicit immutable state for a valid network response, a validated
  fallback, or an unavailable result;
- accept fallback input as `unknown` and validate it through the same selected
  response schema and HTTP status;
- evaluate a lazy fallback only after the network response fails;
- retain the original network `ValidationError` for local diagnostics;
- never cast or return the failed network payload as inferred response data;
- keep reporting side effects outside the recovery helper and document
  redaction, deduplication, and rate-limiting guidance.

### Milestones

#### M0: RFC and Compatibility Contract

- Specify grouping, root paths, field-key formatting, collision behavior, and
  recursive union handling.
- Confirm that every API and type change is additive under semver.
- Decide whether both helpers belong in core or whether only the lossless
  grouping primitive belongs there. Any new package boundary requires an ADR.
- Add behavior examples for nested objects, arrays, records, HTTP-prefixed
  paths, custom refinements, and ordinary/discriminated unions.

Exit criteria: accepted RFC, no unresolved result-shape or path-semantics
questions, and an explicit compatibility statement.

#### M1: Lossless Path Grouping

- Implement `groupIssuesByPath()`.
- Cover root, string, numeric, and non-identifier path segments.
- Cover repeated paths and stable ordering.
- Cover frozen input and output containers.
- Cover union summaries and retained branch trees without implicit flattening.

Exit criteria: no issue information is lost, reordered, or mutated.

#### M2: Form Projection

- Implement `toFieldErrors()` on the accepted grouping semantics.
- Preserve multiple messages per field.
- Support explicit root and path formatting.
- Specify collision behavior and test adversarial property names.
- Document adapters for common form-library shapes without depending on those
  libraries.

Exit criteria: nested validation results can be projected deterministically to
a field-error record, including root-level failures.

#### M3: External Formatting

- Add the accepted per-call formatter hook to diagnostic and field helpers.
- Preserve existing default English rendering.
- Cover external formatters, custom messages, nested paths, and recursive union
  output.
- Document the 2.1 localization boundary and a complete application-owned
  formatter example.

Exit criteria: consumers can control rendered text without mutating schemas,
issues, or global process state.

#### M4: Production Response Recovery

- Decide the exact helper and discriminated result shape in the 2.1 RFC.
- Implement recovery on top of strict `safeParseHttpResponse()` semantics.
- Cover status-specific response maps, lazy fallback evaluation, invalid
  fallbacks, immutable results, and preservation of the original error.
- Export the accepted API from `@safe-shape/http` and the umbrella package.
- Extend the existing typed guide and runnable example to the accepted API.

Exit criteria: a deployed invalid response can degrade through contract-valid
fallback data or an explicit unavailable state without casts or hidden schema
weakening.

#### M5: Integration and Release

- Export the APIs from core and the umbrella package.
- Add API documentation, quick-start examples, and consumer tarball coverage.
- Add focused benchmarks for large issue lists and repeated paths.
- Run the complete release gate and require explicit release approval.

Exit criteria: public APIs have an accepted RFC, tests, documentation,
benchmarks where relevant, and `npm run release:check` evidence.

### 2.1 Non-Goals

- Async predicates or collectors.
- `safeParseAsync()` or `parseAsync()`.
- Warning-only diagnostics.
- Severity levels on `Issue`.
- Arbitrary custom issue codes.
- Structured diagnostic parameters or payloads.
- Framework-specific form adapters in core.
- Schema-owned locales or global formatter registration.
- Built-in cache storage, retry orchestration, telemetry transport, or UI state
  management for response recovery.

## SafeShape 2.2 Candidate: Async Parsing

Async parsing is useful independently of warnings and structured parameters,
so it may ship before 3.0 if it remains additive. The RFC should evaluate:

- `safeParseAsync()` and the corresponding throwing `parseAsync()` API;
- explicit async refinement APIs rather than silently changing synchronous
  callbacks;
- nested async schemas and deterministic issue ordering;
- sequential versus concurrent execution and observable side effects;
- rejection containment without exposing thrown values;
- the behavior of synchronous entry points when a schema contains async work;
- Standard Schema validation, HTTP helpers, validation reports, and CLI
  propagation;
- Contract IR identity and conservative compatibility for opaque async rules;
- performance overhead for schemas that remain fully synchronous.

Async work must not make `safeParse()` conditionally return a promise. Existing
synchronous schemas, result objects, and default Standard Schema behavior must
remain unchanged. If those constraints cannot be met cleanly, async parsing is
part of 3.0 instead of 2.2.

## SafeShape 3.0: Diagnostics v2

### Goal

Introduce one coherent diagnostic model for fatal errors, non-fatal warnings,
and structured application data. This is a major release because warnings can
make a parse successful while still producing diagnostics, and successful
result objects currently contain only `success` and `data`.

### Planned Capabilities

- warning diagnostics that do not make parsing unsuccessful;
- structured, JSON-safe custom diagnostic parameters;
- formatters that localize native and custom messages from stable codes and
  typed parameters rather than parsing English strings;
- explicit warning propagation through parsing, thrown APIs, Standard Schema,
  validation reports, HTTP helpers, and CLI JSON output;
- async parsing from the 2.2 candidate, if it was not safe to release in 2.x;
- a documented migration path from 2.x issues and formatter hooks.

### Decisions Required Before Implementation

- Whether `Issue` gains `severity` or the model becomes a broader
  `Diagnostic` type.
- Whether successful `ParseResult` values always contain a diagnostics array
  or expose warnings through a separate detailed result API.
- What `parse()` does with warnings when it returns only data.
- How warnings map to Standard Schema, whose success result has no standard
  warning channel.
- Whether nested schemas accumulate warnings after later fatal failures.
- The allowed parameter value model, copy/freeze depth, serialization rules,
  size limits, and treatment of sensitive values.
- How diagnostic codes and parameter schemas are versioned for formatter
  compatibility.
- How CLI exit codes distinguish success-with-warnings from validation
  failure.

### Release Gates

- Accepted result-model and diagnostics RFCs.
- Migration guide from 2.x.
- ADRs for any package-boundary or execution-model changes.
- Exhaustive type-level and runtime coverage for success, warnings, errors,
  async execution, nesting, union branches, and transforms.
- Stable machine-readable CLI fixtures and consumer installation coverage.
- Full release gate and explicit major-release approval.

## Ordering Rationale

The 2.1 helpers depend only on the stable 2.0 issue model and provide immediate
value to application code. They also create a real formatter integration point
that can later consume Diagnostics v2 parameters.

Warnings and structured parameters should be designed together: severity
changes result success semantics, while parameters define the stable data a
formatter needs. Shipping either model piecemeal would create extra migration
steps and risk locking in an incomplete representation.
