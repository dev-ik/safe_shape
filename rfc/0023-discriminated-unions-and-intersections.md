# RFC 0023: Discriminated unions and intersections

## Status

Accepted for the second production-core M3 slice.

## Motivation

Ordinary unions are convenient but try every branch and currently collapse a
failed match into one `invalid_union` issue. Production contracts also need a
predictable tagged-union path that selects exactly one branch and preserves the
selected branch diagnostics.

Contracts also need to express that one input must satisfy two schemas. This
must not introduce hidden coercion or an order-dependent shallow merge when
the schemas produce structured output.

## Proposal

Add two immutable schema builders:

```ts
import {
  discriminatedUnion,
  intersection,
  literal,
  object,
  string,
} from "@safe-shape/core";

const event = discriminatedUnion("type", [
  object({ type: literal("created"), id: string() }),
  object({ type: literal("deleted"), id: string() }),
] as const);

const boundedName = intersection(
  string({ minLength: 2 }),
  string({ maxLength: 100 }),
);
```

The namespace forms are `schema.discriminatedUnion()` and
`schema.intersection()`.

### Discriminated unions

`discriminatedUnion(discriminator, choices)` accepts a non-empty readonly tuple
of object schemas. Every choice must expose the discriminator as a required
property whose schema is either a literal string or finite number, or an enum
of strings and finite numbers. Discriminator values must be unique across all
choices. Invalid configurations fail eagerly with `TypeError`.

At runtime, a non-object input produces `invalid_type`. A missing or unknown
tag produces `invalid_discriminator` at the discriminator property path. A
known tag selects exactly one choice; its complete diagnostics and transformed
output are preserved.

### Intersections

`intersection(left, right)` parses the original input through both schemas. If
one or both sides fail, their diagnostics are preserved in left-to-right order.
If both sides succeed, outputs are combined by these deterministic rules:

1. `Object.is(left, right)` returns the shared value.
2. Arrays with equal lengths are combined recursively by index.
3. Plain records are combined recursively by the sorted union of own keys.
4. Every other disagreement produces `intersection_conflict` at the current
   schema path.

New containers created by a successful merge are frozen. The implementation
does not mutate or freeze caller-owned values, invoke setters, or perform
coercion.

## Contract IR and Tooling

Contract IR gains explicit nodes:

```ts
{ kind: "discriminatedUnion", discriminator, choices }
{ kind: "intersection", left, right }
```

- JSON Schema maps them to `oneOf` and `allOf` respectively.
- TypeScript generation maps them to a union and an intersection.
- Snapshot v1 and v2 preserve both nodes and verify their fingerprints.
- Compatibility returns `safe` for exact equality and `unknown` for changed
  nodes until structural containment rules are accepted in M5.

## Compatibility

The builders are additive. Extending the public `SchemaDefinition` and
snapshot node unions is a deliberate 2.0 source change for exhaustive
consumers and must not ship as 1.x.

## Current limitation

Object schemas currently reject unknown properties. Therefore an intersection
of strict objects with disjoint shapes fails validation before output merging.
Useful object composition requires matching shapes today; composition across
different shapes becomes practical after M3 adds explicit object
unknown-property policies.

## Non-Goals

- Changing ordinary union diagnostics or branch-selection behavior.
- Inferring a discriminator from the branch schemas.
- Boolean, null, undefined, non-finite, or negative-zero discriminator values.
- Deep equivalence for class instances, dates, maps, sets, or other non-plain
  objects.
- Graph-aware compatibility rules or object unknown-property policies.
