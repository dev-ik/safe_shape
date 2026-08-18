# RFC 0038: addressable custom diagnostics

## Status

Accepted for SafeShape 2.0 milestone M3.1.

## Motivation

`refine()` currently reports one root-level `custom` issue when a predicate
fails. Cross-field rules need to attach issues to specific properties or array
items, and one parsed value may violate more than one part of the same semantic
rule. Requiring several predicates repeats work and cannot express one
deterministic multi-issue result.

SafeShape needs this capability without turning opaque application logic into a
native constraint or allowing arbitrary diagnostic payloads.

## Public API

Add an optional relative `path` to `RefinementOptions`:

```ts
object({
  password: string(),
  confirmation: string(),
}).refine(
  (value) => value.password === value.confirmation,
  {
    id: "password-confirmation/v1",
    path: ["confirmation"],
    message: "Passwords must match.",
  },
);
```

Add `schema.refineWithIssues(collector, { id })`. The semantic rule id is
required. The synchronous collector receives a frozen context with
`addIssue(input)`:

```ts
const range = object({ start: number(), end: number() }).refineWithIssues(
  (value, context) => {
    if (value.start > value.end) {
      context.addIssue({
        path: ["end"],
        message: "End must not be smaller than start.",
        expected: "number >= start",
      });
    }
  },
  { id: "ordered-range/v1" },
);
```

`CustomIssueInput` contains only:

- optional relative `path` of string or number segments;
- required `message`;
- optional `expected` and `suggestion` strings.

Every collected issue uses the stable `custom` code. Its received description
is derived from the parsed value at the relative path. Arbitrary codes,
severity levels, payloads, and received-value overrides are not accepted.

## Execution Semantics

Custom checks run only after base parsing succeeds. Checks run in declaration
order, and issues from each collector retain `addIssue()` order. All returned
issues and paths are copied and frozen.

Paths are relative to the schema where the refinement is attached. Nested
containers and HTTP request sections prepend their existing path. An omitted
path addresses the refined value itself.

A collector that adds no issues succeeds. Every collected issue is an error;
warning-only diagnostics are not supported. If a predicate or collector
throws, SafeShape returns a deterministic `custom` issue and does not expose
the thrown value. If a collector returns a promise-like value, parsing fails
with an explicit synchronous-only custom issue.

## Contract and Tooling Semantics

Ordinary and collector refinements remain opaque Contract IR behavior. Their
semantic ids occupy the existing ordered `refinements` list, so snapshots and
compatibility use the same stable-id rules. The collector callback and issue
text are runtime behavior and are not serialized.

Standard Schema, validation reports, CLI validation, and HTTP boundary helpers
reuse native SafeShape issues and therefore preserve paths and ordering without
translation.

JSON Schema export rejects collector refinements through the existing
`json_schema.refinement.unrepresentable` diagnostic. It must not emit a partial
schema or approximate the rule.

## Compatibility

Adding methods and option fields is additive. Existing `refine()` behavior and
root-path default remain unchanged. Stable refinement ids continue to be the
compatibility identity; changed or anonymous behavior remains unproven.

## Non-Goals

- Async refinements.
- Warning-only diagnostics.
- Arbitrary issue codes, severity, metadata, or payloads.
- Serializing callbacks or generated issue text into Contract IR.
- Translating opaque rules into JSON Schema.
