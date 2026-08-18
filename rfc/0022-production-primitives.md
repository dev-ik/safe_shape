# RFC 0022: enum, unknown, and never schemas

## Status

Accepted for the first production-core M3 slice.

## Motivation

Production JSON contracts frequently need a closed set of scalar values, an
explicitly unconstrained boundary, or an impossible branch. Modeling these with
unions, anonymous refinements, or undocumented conventions makes Contract IR
and compatibility artifacts less precise.

## Proposal

Add three immutable schema builders:

```ts
import {
  enum as enumSchema,
  never,
  unknown,
} from "@safe-shape/core";

const status = enumSchema(["draft", "published"] as const);
const passthrough = unknown();
const impossible = never();
```

The namespace form is `schema.enum(values)`, `schema.unknown()`, and
`schema.never()`. The equivalent non-reserved named export `enumeration()` is
available for codebases that prefer not to alias imports.

`enum()` accepts a non-empty readonly tuple of strings and finite numbers. It
preserves the literal union in input and output inference, compares values with
`Object.is`, and rejects duplicate entries and negative zero. Negative zero is
rejected because JSON and JSON Schema cannot distinguish it canonically from
zero.

`unknown()` accepts every JavaScript value and returns the original value
without cloning, coercion, or freezing user-owned data. Its inferred input and
output are both `unknown`.

`never()` rejects every value with a stable `forbidden_value` issue. Its inferred
input and output are both `never`.

## Contract IR and Tooling

Contract IR gains explicit `enum`, `unknown`, and `never` nodes. Runtime enum
diagnostics retain caller order, while Contract IR and snapshots sort enum
values canonically because their order does not change the accepted-value set.
Reordering an enum therefore does not change its fingerprint.

- JSON Schema maps enum to `enum`, unknown to `{}`, and never to `{ not: {} }`.
- TypeScript generation maps them to a literal union, `unknown`, and `never`.
- Snapshot v1 and v2 preserve the nodes and verify their fingerprints.
- Compatibility returns `safe` for identical nodes through exact equality and
  `unknown` for changed enum sets until the M5 containment rules are accepted.

## Compatibility

The builders are additive. Extending the public `SchemaDefinition` and snapshot
node unions is a deliberate 2.0 source change for exhaustive consumers and must
not ship as 1.x.

## Non-Goals

- Boolean, null, undefined, bigint, symbol, NaN, infinity, or negative-zero enum
  members. Existing literal and union schemas remain available where their
  runtime-only semantics are intentional.
- Enum set widening and narrowing rules; those belong to M5.
- Type-guard refinements that narrow an `unknown()` schema statically.
