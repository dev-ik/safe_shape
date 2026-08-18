# RFC 0018: native toolable constraints

## Status

Accepted for the initial 2.0 constraint slice.

## Motivation

Custom `refine()` predicates are intentionally opaque to contract snapshots and
compatibility analysis. Common length, range, and integer requirements should
instead have explicit runtime semantics that can be exported and compared.

## Proposal

Add immutable optional constraint objects to existing builders:

```ts
string({ minLength: 1, maxLength: 100 });
number({ minimum: 0, maximum: 10 });
number({ integer: true });
integer({ minimum: 0, maximum: 10 });
array(string(), { minLength: 1, maxLength: 20 });
```

Public constraint types are:

- `StringConstraints`: `minLength`, `maxLength`;
- `NumberConstraints`: `minimum`, `maximum`, `integer`;
- `IntegerConstraints`: `minimum`, `maximum`;
- `ArrayConstraints`: `minLength`, `maxLength`.

All bounds are inclusive. String length is measured in Unicode code points so
runtime validation matches JSON Schema `minLength` and `maxLength` semantics.
Array length uses JavaScript array item count.

Constraint configuration is validated when the schema is constructed:

- lengths must be non-negative safe integers;
- numeric bounds must be finite;
- minimum values must not exceed maximum values.
- integer ranges must contain at least one integer.

Runtime constraint failures use stable issue codes:

- `too_small`;
- `too_large`;
- `not_integer`.

Core schema descriptions preserve native constraints. JSON Schema export maps
them to `minLength`, `maxLength`, `minimum`, `maximum`, `type: "integer"`,
`minItems`, and `maxItems`.

Contract snapshots include constraint objects. Compatibility analysis proves
accepted-value subset relationships:

- lowering a minimum or raising a maximum widens a target contract;
- raising a minimum or lowering a maximum narrows a target contract;
- integer input is a subset of number input;
- number input is not a subset of integer input.

The direction (`backward`, `forward`, or `full`) determines whether a concrete
change is safe or breaking.

## Non-Goals

This slice does not add:

- exclusive bounds;
- `multipleOf`;
- string patterns or formats;
- record key constraints;
- arbitrary custom constraint callbacks.

These require their own exact runtime and compatibility semantics and can be
added without changing this API.

## Alternatives

- Express every constraint through `refine()`. Rejected because snapshots
  cannot prove compatibility for arbitrary JavaScript predicates.
- Add fluent methods such as `.min()`. Deferred because builder options extend
  the current conservative API with less public surface.
- Count UTF-16 code units through `string.length`. Rejected because this would
  disagree with JSON Schema for astral Unicode characters.

## Migration

All builder parameters and `integer()` are additive. Calls to `string()`,
`number()`, and `array(schema)` preserve their current runtime behavior and
inferred types.
