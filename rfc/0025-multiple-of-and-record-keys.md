# RFC 0025: Numeric multiples and record key constraints

## Status

Accepted for the fourth production-core M3 slice.

## Motivation

Production contracts need decimal increments such as currency subunits and
bounded identifiers used as record keys. Modeling either rule with anonymous
refinements hides it from Contract IR, snapshots, compatibility analysis, JSON
Schema, and CLI artifacts.

JavaScript remainder arithmetic is not sufficient for decimal contracts:
`0.3 % 0.1` is not zero because the operands are binary floating-point values.
SafeShape must define stable behavior rather than add an undocumented epsilon.

## Proposal

Extend numeric constraints with `multipleOf` and add record key constraints:

```ts
interface NumberConstraints {
  readonly minimum?: number;
  readonly maximum?: number;
  readonly integer?: boolean;
  readonly multipleOf?: number;
}

interface RecordConstraints {
  readonly key?: StringConstraints;
}

const amount = number({ minimum: 0, multipleOf: 0.01 });
const counters = record(integer(), {
  key: { pattern: "^[a-z][a-z0-9_]*$", maxLength: 64 },
});
```

`multipleOf` must be a positive finite number. Zero, negative values,
infinities, and NaN fail eagerly with `TypeError`.

Runtime divisibility uses the shortest base-10 representation returned by
`Number.prototype.toString()`. Each operand is converted to an exact integer
coefficient and decimal scale, aligned with `BigInt`, and compared without an
epsilon. Consequently `0.3` is a multiple of `0.1`, while
`0.30000000000000004` is not.

A failed numeric check produces `not_multiple_of`. Integer, range, and multiple
checks accumulate in their declared stable order.

`RecordConstraints.key` accepts the existing native `StringConstraints`:
`minLength`, `maxLength`, `pattern`, and `format`. Every own enumerable string
key is validated without coercion or renaming. Key issues use the record key as
their path segment and retain the existing string issue codes. Values are still
validated even when their key fails so callers receive complete diagnostics.

## Contract IR and Tooling

`multipleOf` is stored in the existing number constraint node. Record nodes
gain an optional immutable `key` constraint object:

```ts
{ kind: "record", key?: StringConstraints, value: SchemaDefinition }
```

- Snapshot v1 and v2 preserve both constraints and validate them when parsing.
- JSON Schema maps `multipleOf` directly and record keys to `propertyNames`.
- TypeScript output remains `number` and `Readonly<Record<string, Value>>`.
- CLI export and validation inherit the runtime and JSON Schema behavior.

## Compatibility

Unchanged constraints retain existing analysis. Obvious decimal lattice
widening is safe: removing `multipleOf`, or changing the target step so every
source multiple remains a target multiple. Relationships that cannot be proven
from exact divisibility and the existing integer/range rules are `unknown`
rather than optimistically safe.

Record key constraints are compared as string constraints at a synthetic key
path, while record values keep their existing `*` path. Pattern and format
changes therefore retain their conservative M5 behavior.

The API changes are additive, while the new issue-code and public Contract IR
union shape remain part of the deliberate 2.0 source surface. They must not
ship as 1.x.

## Non-Goals

- Decimal output types, rounding, quantization, or coercion.
- Tolerance-based floating-point comparison.
- Record key transforms, renaming, symbol keys, or inherited properties.
- Arbitrary key schemas whose output is not the original string key.
- Complete arithmetic proof across every combined range/integer/lattice case;
  unproven compatibility remains `unknown`.
