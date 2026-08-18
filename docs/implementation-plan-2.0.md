# SafeShape 2.0 Implementation Plan

Status: complete

Last updated: 2026-08-18

This document is the execution checklist for the accepted
[SafeShape 2.0 product plan](roadmap-2.0.md). A milestone is complete only when
its public APIs have an accepted RFC, documentation, tests, and relevant
release evidence.

## M0: Contract Evolution Vertical Slice

Status: complete

- [x] Add deterministic contract snapshots and fingerprints.
- [x] Add conservative backward, forward, and full compatibility reports.
- [x] Add `@safe-shape/compat` without introducing a core dependency.
- [x] Add `contract snapshot` and `contract check` CLI workflows.
- [x] Add stable identifiers for opaque refinements and transforms.
- [x] Add native string, number, integer, and array constraints.
- [x] Compare native constraint widening and narrowing.

Exit evidence: RFC 0017, RFC 0018, ADR 0012, package tests, CLI tests,
consumer installation, deterministic snapshots, and release checks.

## M1: Input and Output Type Model

Status: complete

- [x] Extend schemas to `Schema<TOutput, TInput = TOutput>`.
- [x] Add `InferInput<TSchema>` and `InferOutput<TSchema>` while retaining
  `Infer<TSchema>` as an output alias.
- [x] Preserve the original input through transforms.
- [x] Propagate input and output types through containers and wrappers.
- [x] Document the compatibility and migration rules.

Exit criteria:

- existing `Schema<T>` source meaning is preserved;
- runtime parsing behavior is unchanged;
- nested transforms infer distinct input and output object types;
- type-level and runtime tests pass across all workspace packages.

## M2: Contract IR v2 and Recursion

Status: complete

- [x] Define separate input and output contract descriptions.
- [x] Add stable reusable definitions and references.
- [x] Add `lazy()` and recursive contracts.
- [x] Define canonical ordering and serialization for graph-shaped contracts.
- [x] Version the next snapshot format and its migration policy.

Exit criteria:

- repeated schemas use deterministic references;
- recursive schemas can be described without infinite traversal;
- input and output fingerprints are independently reproducible;
- opaque behavior remains explicit.

Exit evidence: RFC 0020, RFC 0021, ADR 0013, deterministic recursive graph
tests, independently verified input/output fingerprints, strict graph parsing,
and preserved snapshot v1 fixtures.

## M3: Production Core Surface

Status: complete

- [x] Add `enum()`, `unknown()`, and `never()`.
- [x] Add `discriminatedUnion()` and `intersection()`.
- [x] Add string patterns and selected exact formats.
- [x] Add numeric `multipleOf` and record key constraints.
- [x] Add explicit object unknown-property policies.
- [x] Preserve branch diagnostics for failed unions.

Exit evidence: RFC 0022 through RFC 0027, ADR 0014 through ADR 0016, runtime and
artifact tests, recursive immutable union diagnostics across validation, CLI,
and HTTP request paths, consumer tarball smoke coverage, and benchmark scenarios.

Exit criteria:

- every capability is represented in runtime behavior and Contract IR;
- schema, result, and description objects remain immutable;
- no hidden coercion or silent stripping is introduced.

## M3.1: Addressable Custom Diagnostics

Status: completed

- [x] Accept an RFC for the synchronous custom-diagnostic refinement API and
  its execution semantics.
- [x] Add a collector-style refinement that can emit multiple issues from one
  successfully parsed value.
- [x] Support relative paths for collected issues and the ordinary
  single-issue `refine()` case.
- [x] Represent custom diagnostic refinements as opaque behavior with stable
  semantic rule identifiers.
- [x] Preserve deterministic issue order and immutable issue/path containers.
- [x] Propagate addressable custom issues unchanged through Standard Schema,
  validation reports, CLI validation, and HTTP boundary helpers.
- [x] Reject custom diagnostic refinements explicitly during JSON Schema
  export rather than producing a partial approximation.
- [x] Document async refinements, warning-only diagnostics, and arbitrary
  diagnostic payloads as out of scope for 2.0.

Exit criteria:

- one refinement can report multiple issues at distinct nested paths;
- simple one-issue cross-field rules do not require the collector API;
- thrown callbacks fail deterministically without leaking exceptions;
- tooling never presents opaque custom validation as a native constraint;
- public APIs have documentation, type tests, runtime tests, and installed
  consumer coverage.

Completion evidence: RFC 0038, ADR 0027, `refine(..., { path })`, required-id
`refineWithIssues()`, frozen collector context and issue paths, deterministic
throw/async failures, opaque Contract IR and compatibility coverage, explicit
JSON Schema rejection, Standard Schema/validation/CLI/HTTP propagation tests,
umbrella-package coverage, and installed-consumer tarball validation.

## M4: Standards and JSON Schema Artifacts

Status: completed

- [x] Implement Standard Schema V1 validation and type inference.
- [x] Implement Standard JSON Schema V1 input and output conversion.
- [x] Support JSON Schema Draft 2020-12 and Draft 7.
- [x] Support `$id`, `$defs`, `$ref`, repeated schemas, and recursion.
- [x] Return machine-readable warnings or errors for unrepresentable behavior.

Implemented-slice evidence: RFC 0028, ADR 0017, synchronous native
`~standard` validation, transform-aware input/output inference, immutable
native diagnostics, umbrella exports, consumer tarball coverage, and a
benchmark scenario.

Standard JSON Schema evidence: RFC 0029, ADR 0018, frozen combined protocol
adapters, independent input/output conversion, Draft 2020-12 target validation,
recursive reference coverage, explicit opaque-output failures, umbrella
exports, and consumer tarball coverage.

Dialect evidence: RFC 0030, ADR 0019, explicit `target` selection, official URI
inference, Draft 7 `definitions` and tuple syntax, conflicting-declaration
errors, Standard JSON Schema support, CLI coverage, and installed-consumer
coverage.

Identity and reuse evidence: RFC 0031, ADR 0020, validated root `$id`, Standard
`libraryOptions.id`, contextual CLI `--id`, deterministic single-definition
reuse, collision rejection, Draft 2020-12 and Draft 7 reference coverage, and
recursive installed-consumer coverage.

Diagnostic evidence: RFC 0032, ADR 0021, immutable `safeToJsonSchema()` results,
structured throwing errors, complete refinement and opaque-output discovery,
dialect-specific artifact paths, Standard adapter propagation, CLI JSON issues,
umbrella exports, and installed-consumer coverage.

Exit criteria:

- input and output artifacts are independently testable;
- supported output is deterministic across repeated builds;
- exporters never silently approximate opaque behavior.

## M5: Compatibility Rule Completion

Status: completed

- [x] Document the complete compatibility rule matrix.
- [x] Complete enum, tuple, union, and object-policy rules.
- [x] Compare reusable references and recursive contracts.
- [x] Compare transform input and output sides conservatively.
- [x] Add HTTP producer/consumer and request/response presentation.
- [x] Add generic CI examples and migration diagnostics.

Exit criteria:

- every safe classification is proven by accepted-value containment;
- opaque or unsupported relationships return `unknown` or `risky`;
- every rule has safe, breaking, and edge-case coverage where applicable.

Finite-containment evidence: RFC 0033, ADR 0022, the normative compatibility
matrix, direction-aware enum/literal membership, exact native constraint checks,
`never`/`unknown` boundary rules, conservative multi-branch union coverage, and
safe/breaking/full-direction tests. These finite proofs form the basis for the
completed structural rules below.

Structural-containment evidence: RFC 0034, ADR 0023, tuple/array effective
length comparison, empty-contract propagation, union disjoint witnesses, the
complete unknown-property policy matrix, output-identity property rules, and
directional/full/opaque edge-case tests.

Graph-containment evidence: RFC 0035, ADR 0024, explicit v2 comparison APIs,
side-specific fingerprints, coinductive reference-pair traversal, id- and
sharing-independent semantics, recursive safe/breaking/full coverage, and
conservative stable/changed/anonymous transform output tests.

HTTP-presentation evidence: RFC 0036, ADR 0025, an immutable report projection,
request/response party mapping, producer/consumer focus for every direction,
v1/v2 proof preservation, package-boundary documentation, and installed-
consumer coverage.

CI and migration evidence: RFC 0037, ADR 0026, immutable migration decisions
derived from compatibility reports, v2 CLI snapshot/check flags with v1
defaults preserved, runnable CLI and installed-consumer coverage, portable
shell/GitHub/GitLab examples, and a repository release-gate workflow.

## M6: 2.0 Release Candidate

Status: complete

- [x] Publish the 1.x to 2.0 migration guide.
- [x] Add recursive and compatibility benchmark scenarios.
- [x] Verify package exports and dependency direction.
- [x] Run the complete release gate and consumer installation suite.
- [x] Review every RFC and ADR status.
- [x] Require explicit release approval.

Exit criteria are the release evidence and success criteria in the accepted
product plan.

## Deferred Beyond 2.0

- OpenAPI endpoint catalogs and generation.
- Provider-specific AI and MCP target profiles.
- Ahead-of-time validator compilation.
- Test-data and boundary-case generation.
