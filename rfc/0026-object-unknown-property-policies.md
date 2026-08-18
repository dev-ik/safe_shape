# RFC 0026: explicit object unknown-property policies

## Status

Accepted for the fifth production-core M3 slice.

## Motivation

`object(shape)` currently rejects every property not declared in `shape`.
Strict-by-default behavior is safe at trust boundaries, but composition and
forward-compatible payloads sometimes need to accept extra properties. That
choice must be explicit and toolable; implicit stripping would violate
SafeShape's no-hidden-coercion principle.

## Proposal

Add an optional policy to `object()`:

```ts
type UnknownPropertyPolicy = "reject" | "strip" | "passthrough";

interface ObjectOptions<
  TPolicy extends UnknownPropertyPolicy = UnknownPropertyPolicy,
> {
  readonly unknownProperties?: TPolicy;
}

const strict = object({ id: string() });
const compatible = object(
  { id: string() },
  { unknownProperties: "strip" },
);
const extensible = object(
  { id: string() },
  { unknownProperties: "passthrough" },
);
```

The default remains `reject`, preserving existing runtime behavior.

- `reject` returns `unexpected_property` issues for every extra own enumerable
  string property.
- `strip` explicitly accepts extra properties and omits them from output.
- `passthrough` accepts and copies extra properties to output unchanged.

Known properties are always validated first. `reject` issues retain input key
order after known-property diagnostics. `strip` and `passthrough` do not coerce,
rename, validate, or deep-freeze extra values. Every produced object container
is frozen, and prototype-like keys are copied as safe own data properties.

An unknown policy name fails eagerly with `TypeError`. Schema options and
Contract IR descriptions remain immutable.

## Type Semantics

`reject` and `strip` retain the existing `ObjectOutput<TShape>` type.
`passthrough` adds a readonly string index whose values are `unknown`.
Permissive input types similarly admit readonly string-keyed unknown values.
No policy weakens the declared types of known properties.

## Contract IR and Tooling

Object nodes gain a required `unknownProperties` field. Default objects are
described as `reject`; snapshots therefore retain their existing explicit
strict marker.

- Snapshot v1 and v2 preserve and validate all three policy names.
- JSON Schema maps `reject` to `additionalProperties: false` and `passthrough`
  to `additionalProperties: true`.
- `strip` maps to `true` for input export and `false` for output export because
  JSON Schema validates but does not transform instances.
- TypeScript generation emits an unknown string index only for `passthrough`.
- CLI export and validation inherit the same behavior.

## Compatibility

For unchanged shapes, accepted input sets form the relation `reject` as a
subset of both permissive policies. A source `reject` contract can therefore
move to `strip` or `passthrough` in the accepting direction; the reverse is
breaking. `strip` and `passthrough` accept the same input set but have observably
different outputs, so changing between them is breaking.

Shape changes combined with permissive policies are reported conservatively
when validation or output preservation depends on an arbitrary extra value.
Required additions and removals into a rejecting target remain provably
breaking. The comparator must prefer `unknown` over an unsupported optimistic
proof.

## Non-Goals

- Catch-all value schemas; use `record()` for homogeneous values.
- Symbol or inherited-property handling.
- Deep cloning or freezing passthrough values.
- Implicit stripping without an explicit option.
- JSON Schema mutation extensions for representing strip behavior.
