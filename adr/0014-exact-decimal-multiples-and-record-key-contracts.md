# ADR 0014: use exact decimal lattices and string constraints for record keys

## Status

Accepted.

## Context

Numeric increments and constrained map keys must retain the same meaning in
runtime validation, Contract IR, snapshots, compatibility reports, and JSON
Schema. Binary remainder arithmetic makes ordinary decimal values such as
`0.3` and `0.1` unsuitable for a stable `multipleOf` contract, while arbitrary
key schemas could transform or rename JavaScript object keys.

## Decision

SafeShape interprets `multipleOf` through each number's shortest base-10
`Number.prototype.toString()` representation. Runtime validation converts the
representations to integer coefficients and decimal scales, aligns them with
`BigInt`, and checks exact divisibility without an epsilon.

Record keys use the existing immutable `StringConstraints` instead of an
arbitrary schema. Keys are validated in place and are never coerced,
transformed, or renamed. Key and value validation both run so diagnostics stay
complete.

Contract IR owns these declarative constraints. Tooling packages preserve or
translate them, and compatibility analysis proves only direct decimal-lattice
containment; unproven relationships remain `unknown`.

## Consequences

Decimal behavior is deterministic across runtime and tooling, including the
distinction between `0.3` and `0.30000000000000004`. Record output types remain
`Readonly<Record<string, Value>>`, and JSON Schema can represent key rules with
`propertyNames`. This does not provide decimal quantization, tolerance-based
comparison, arbitrary key transforms, or complete arithmetic theorem proving.
