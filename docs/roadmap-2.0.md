# SafeShape 2.0 Product and Release Plan

Status: accepted

Last updated: 2026-08-18

Execution progress and release gates are tracked in
[implementation-plan-2.0.md](implementation-plan-2.0.md).

## Product Direction

SafeShape 2.0 should move from being a focused runtime validation library to
being a runtime contract platform that helps teams evolve contracts safely.

Positioning:

> Contracts that know when they break.

The defining capability of 2.0 should be deterministic contract descriptions,
contract snapshots, and conservative compatibility analysis. Validation,
diagnostics, generated artifacts, and HTTP tooling should all build on the same
contract model.

SafeShape should not compete primarily on schema API size, custom syntax, or
the number of convenience validators. Its differentiation should remain:

- explicit runtime behavior;
- immutable schemas and results;
- stable, actionable diagnostics;
- deterministic tooling artifacts;
- conservative compatibility decisions;
- first-party CLI and CI workflows.

## Research Summary

The TypeScript schema ecosystem already has strong specialists:

- Zod provides a broad schema API, codecs, metadata registries, and first-party
  JSON Schema conversion.
- Valibot emphasizes modularity, tree shaking, and small bundles.
- ArkType provides TypeScript-like syntax, scopes, and recursive types.
- TypeBox combines JSON Schema-native types with compiled validation.
- Standard Schema provides vendor-neutral validation, type inference, and JSON
  Schema conversion interfaces.

SafeShape should therefore focus on a less crowded problem: detecting how a
runtime contract changed and whether the change is safe for existing producers
and consumers.

This direction is consistent with established schema evolution workflows such
as Buf breaking-change checks and schema registry compatibility modes.

Research references:

- [Zod](https://zod.dev/packages/zod)
- [Zod JSON Schema](https://zod.dev/json-schema)
- [Valibot introduction](https://valibot.dev/guides/introduction/)
- [ArkType scopes](https://arktype.io/docs/scopes)
- [TypeBox](https://github.com/sinclairzx81/typebox)
- [Standard Schema](https://standardschema.dev/)
- [Buf breaking-change detection](https://buf.build/docs/breaking/)
- [Confluent schema evolution](https://docs.confluent.io/platform/current/schema-registry/fundamentals/schema-evolution.html)
- [JSON Schema specification](https://json-schema.org/specification)
- [OpenAPI Specification](https://spec.openapis.org/oas/)

## Release Goals

SafeShape 2.0 should:

1. Represent schema input and output types independently.
2. Preserve toolable constraint semantics in a deterministic contract IR.
3. Support the schema primitives needed for production JSON contracts.
4. Interoperate with Standard Schema and Standard JSON Schema.
5. Produce stable contract snapshots and fingerprints.
6. Detect and explain safe, breaking, risky, and unprovable changes.
7. Provide machine-readable compatibility reports suitable for CI.
8. Preserve explicit parsing, immutability, and rich diagnostics.

## Non-Goals

The 2.0 release should not include:

- a hosted schema registry;
- an ORM or serializer framework;
- a form framework or design system;
- framework-specific HTTP adapters in core;
- opaque automatic data repair;
- a new schema definition language;
- a large collection of convenience-only validators;
- provider-specific AI behavior in core;
- a mandatory JIT compiler.

These exclusions keep 2.0 focused on a coherent contract evolution story.

## Workstream 1: Contract IR v2

The current `Schema<T>` model primarily represents parsed output. The 2.0 model
should distinguish input and output while retaining strong inference.

Proposed type direction, subject to RFC:

```ts
interface Schema<TInput = unknown, TOutput = TInput> {
  parse(input: unknown): TOutput;
  safeParse(input: unknown): ParseResult<TOutput>;
}

type InferInput<TSchema extends Schema<any, any>> =
  TSchema extends Schema<infer TInput, any> ? TInput : never;

type InferOutput<TSchema extends Schema<any, any>> =
  TSchema extends Schema<any, infer TOutput> ? TOutput : never;
```

The contract IR should support:

- stable schema identifiers;
- separate input and output descriptions;
- native constraints rather than opaque refinements where possible;
- reusable definitions and references;
- recursive schemas;
- explicit object unknown-property policies;
- stable ordering and canonical serialization;
- deterministic fingerprints;
- explicit markers for opaque refinements and transforms;
- immutable description objects.

`describeSchema` must remain neutral. Core must not depend on JSON Schema,
OpenAPI, CLI, or other tooling packages.

## Workstream 2: Production Core Surface

Add the smallest schema surface required to model common runtime contracts.

Candidate primitives and combinators:

- `integer()`;
- `enum()`;
- `unknown()`;
- `never()`;
- `discriminatedUnion()`;
- `intersection()`;
- `lazy()` for recursive definitions.

Candidate toolable constraints:

- string minimum and maximum length;
- string pattern, email, UUID, date, and date-time formats;
- numeric minimum, maximum, integer, and `multipleOf` constraints;
- array minimum and maximum length;
- record key constraints.

Selected custom diagnostic refinements:

- synchronous `refineWithIssues()`, which can emit zero or more issues from one
  check;
- relative issue paths so cross-field rules can attach diagnostics to specific
  object properties or array items;
- a relative `path` option on ordinary `refine()` for the common single-issue
  case;
- stable semantic rule identifiers so custom validation remains explicit in
  Contract IR, snapshots, and compatibility analysis;
- deterministic issue ordering and the same frozen issue/path guarantees as
  native validation.

RFC 0038 defines the public name and narrow issue-builder shape. Custom
diagnostic refinements remain opaque contract behavior and must not be
approximated by JSON Schema exporters. Async refinements, warning-only
diagnostics, and arbitrary diagnostic payloads are not part of 2.0.

Object behavior must remain explicit. Any strict, passthrough, or stripping
mode must be visible in both the API and contract IR. Stripping is a transform,
not validation-only behavior.

Union diagnostics should retain useful branch information rather than reducing
all failures to one aggregate issue.

Every accepted public capability requires tests, documentation, and an RFC.

## Workstream 3: Standard Interoperability

Implement:

- Standard Schema V1 validation;
- Standard Schema input and output type inference;
- Standard JSON Schema V1 input and output conversion;
- synchronous validation as the default interoperability path.

This should allow schema-agnostic libraries to consume SafeShape without
SafeShape-specific adapters.

Dependency direction must remain one-way. If a package dependency on the
Standard Schema types is introduced, it must be justified in an ADR. Copying
the specification interfaces, where permitted by the specification, should
also be evaluated.

## Workstream 4: JSON Schema Artifacts

Expand `@safe-shape/json-schema` to support deterministic, reusable contract
artifacts.

Required capabilities:

- JSON Schema Draft 2020-12;
- JSON Schema Draft 7;
- `$id`, `$defs`, and `$ref`;
- repeated and recursive schemas;
- input and output schema generation;
- native constraint mapping;
- stable key and definition ordering;
- explicit handling of unrepresentable features;
- machine-readable warnings or errors instead of silent approximation.

The exporter should never claim that an opaque refinement or transform has
been represented when it has not.

## Workstream 5: Contract Evolution

Add a new tooling package, tentatively `@safe-shape/compat`, subject to an ADR.
It should depend on core contract descriptions and must not become a dependency
of core.

Proposed programmatic direction, subject to RFC:

```ts
const report = compareContracts(previousSchema, nextSchema, {
  compatibility: "backward",
});
```

Compatibility results should classify every relevant change as:

- `safe`;
- `breaking`;
- `risky`;
- `unknown`;
- `annotation-only`.

Each finding should include:

- stable rule code;
- schema path;
- previous and next descriptions;
- compatibility direction;
- human-readable explanation;
- suggested remediation when one is reliable.

The engine must be conservative. If compatibility cannot be proven, especially
for opaque refinements, transforms, complex patterns, or unsupported
compositions, it should return `unknown` rather than `safe`.

For HTTP contracts, producer/consumer and request/response terminology should
be preferred over ambiguous direction names when presenting results.

## Workstream 6: Snapshots and CI

Proposed CLI direction, subject to RFC:

```sh
safe-shape contract snapshot \
  --module ./dist/contracts.js \
  --out .safe-shape/contracts.json

safe-shape contract check \
  --module ./dist/contracts.js \
  --against .safe-shape/contracts.json \
  --json
```

Snapshot requirements:

- canonical and deterministic output;
- explicit format version;
- schema identifier and fingerprint;
- no executable code;
- no secrets or sample payloads by default;
- stable ordering for reviewable diffs;
- forward-compatible parsing of additive metadata.

CLI requirements:

- stable JSON output;
- documented exit codes;
- compatibility failures represented as command results;
- operational failures represented as CLI errors;
- usable locally and in generic CI without authentication.

## Deferred Follow-Up Releases

The following capabilities are valuable but should follow the focused 2.0
release unless implementation evidence shows they are required by the core
design.

### OpenAPI

Create an endpoint catalog above `@safe-shape/http` and generate OpenAPI 3.1 or
3.2 descriptions. Compatibility checks should understand request and response
direction separately.

### AI and MCP Target Profiles

Provide target linting and JSON Schema subset reports for systems such as MCP,
OpenAI structured outputs, and Gemini structured outputs. Provider-specific
profiles should live outside core because they evolve independently.

### Ahead-of-Time Compilation

Compile contract IR into standalone validators for startup-sensitive and
restricted environments. Compiled and interpreted validation must produce
equivalent results and diagnostics.

### Test Data and Boundary Generation

Generate valid examples and invalid boundary cases from toolable constraints.
Opaque refinements must require user-provided generators or be reported as
unsupported.

## Delivery Sequence

### Phase 1: Design

- Write the Contract IR v2 RFC.
- Write the input/output schema model RFC.
- Write the compatibility semantics RFC.
- Write ADRs for canonicalization and new package boundaries.
- Define migration and API compatibility requirements.

Exit criteria:

- public type direction approved;
- IR examples cover every existing schema kind;
- compatibility terminology and conservative fallback rules approved;
- no unresolved core-to-tooling dependency inversion.

### Phase 2: Core Foundation

- Implement input/output inference.
- Implement Contract IR v2.
- Add selected production primitives and constraints.
- Add references and recursion.
- Improve union diagnostics.
- Provide migration compatibility where feasible.

Exit criteria:

- runtime and inferred types agree;
- all schema and result objects remain immutable;
- every new public API is documented and tested;
- existing 1.x behavior is either preserved or explicitly documented as a 2.0
  migration.

### Phase 3: Interoperability and Artifacts

- Implement Standard Schema support.
- Implement Standard JSON Schema support.
- Upgrade JSON Schema generation.
- Add deterministic canonical serialization and fingerprints.

Exit criteria:

- generated artifacts are stable across repeated builds;
- input and output artifacts are independently testable;
- unrepresentable behavior is explicit;
- consumer installation tests cover public entry points.

### Phase 4: Compatibility Tooling

- Implement compatibility rules over Contract IR.
- Implement contract snapshots.
- Implement `contract check` and JSON reports.
- Add CI examples and migration diagnostics.

Exit criteria:

- compatibility rule matrix is documented;
- every rule has safe, breaking, and edge-case tests where applicable;
- opaque behavior produces `unknown` or `risky`, never an unsupported `safe`;
- CLI output and exit behavior are stable and tested.

### Phase 5: Release Candidate

- Publish the 1.x to 2.0 migration guide.
- Run type-level, runtime, artifact, CLI, and consumer tests.
- Run benchmarks for valid, invalid, recursive, and compatibility scenarios.
- Verify package exports and dependency direction.
- Run the complete release gate.

Exit criteria:

- all RFCs and ADRs are accepted;
- all public APIs have documentation and tests;
- `npm run release:check` passes;
- no known security vulnerabilities;
- benchmark regressions are understood and documented;
- release requires explicit approval.

## Compatibility Rule Priorities

Implement rules in increasing order of complexity:

1. Primitive kind changes.
2. Required and optional object property changes.
3. Object unknown-property policy changes.
4. Literal and enum widening or narrowing.
5. Numeric and length constraint widening or narrowing.
6. Array and tuple changes.
7. Union variant additions and removals.
8. Reusable references and recursive contracts.
9. Transform and codec input/output changes.
10. Opaque refinements and patterns with conservative fallback.

The initial release does not need to prove every possible compatibility
relationship. It does need to be correct about every relationship it labels
`safe`.

## Primary Risks

### False Safety

Incorrectly classifying a breaking change as safe would undermine the product's
core promise. The compatibility engine must prefer incomplete but sound results
over optimistic heuristics.

### IR Instability

Snapshots become public artifacts. The snapshot format needs its own version and
compatibility policy before release.

### Opaque User Code

Arbitrary refinements and transforms cannot be compared reliably. The API must
make this limitation visible and allow stable user-supplied identifiers where
appropriate.

### Scope Expansion

OpenAPI generation, framework adapters, AI profiles, test generation, and AOT
compilation can delay the defining compatibility feature. They should remain
deferred unless required to validate the core architecture.

### Performance

Richer diagnostics and IR may increase parse or startup cost. Measurements
should separate schema construction, first parse, warm parse, invalid input,
artifact generation, and compatibility analysis.

## Release Evidence

SafeShape 2.0 should not ship without evidence for:

- runtime and TypeScript type agreement;
- immutable schemas, descriptions, results, and reports;
- deterministic contract snapshots;
- stable diagnostics and compatibility rule codes;
- JSON Schema conformance for supported mappings;
- Standard Schema interoperability;
- CLI JSON output and exit semantics;
- 1.x consumer migration examples;
- package boundary integrity;
- benchmark and consumer-install results.

## Success Criteria

The release is successful when a team can:

1. Define a runtime contract once.
2. Infer its input and output TypeScript types.
3. Validate values with stable diagnostics.
4. Export deterministic standard artifacts.
5. Store a reviewable contract snapshot.
6. Change the contract.
7. Run one local or CI command that explains whether existing producers or
   consumers can break.

That workflow should be the canonical SafeShape 2.0 demonstration.
