# RFC 0028: implement Standard Schema V1 natively

## Status

Accepted for the first standards-interoperability M4 slice.

## Motivation

Schema-agnostic TypeScript tools should be able to validate through SafeShape
and infer both contract sides without a SafeShape-specific adapter. Standard
Schema V1 defines the minimal `~standard` protocol used by that ecosystem.

## Proposal

Every public `Schema<TOutput, TInput>` implements the structural
`StandardSchemaV1<TInput, TOutput>` interface and exposes one immutable
`~standard` object:

```ts
schema["~standard"] = {
  version: 1,
  vendor: "safe-shape",
  validate(value, options?) { /* synchronous SafeShape parse */ },
};
```

The input and output generic order follows Standard Schema, while SafeShape's
existing output-first `Schema<TOutput, TInput>` order remains unchanged.
Exported `StandardSchemaV1.InferInput` and `InferOutput` helpers therefore
preserve transforms correctly.

Validation is synchronous. Success returns an immutable `{ value }` result.
Failure returns an immutable `{ issues }` result containing the native frozen
SafeShape issues. SafeShape issues structurally satisfy the standard message
and path fields while retaining richer codes, suggestions, and recursive union
branches for consumers that inspect them.

`libraryOptions` is accepted and ignored because this version defines no
vendor-specific validation options. The phantom `types` property is declared
for inference but omitted at runtime.

## Dependency Policy

The V1 interfaces are included in `@safe-shape/core`. The Standard Schema
specification explicitly permits implementations to copy the interface, and
the protocol requires no runtime package. This avoids adding a dependency from
core while remaining structurally compatible with `@standard-schema/spec`.

## Compatibility

Adding `~standard` is additive for the planned 2.0 surface. Existing parsing,
first-success unions, transforms, diagnostics, and Contract IR are unchanged.
Schema objects and their new protocol object remain frozen.

## Non-Goals

- Standard JSON Schema conversion; that is the next M4 slice.
- Asynchronous SafeShape validation.
- Vendor-specific `libraryOptions`.
- Flattening or translating SafeShape diagnostics into a lossy error model.
- Adding `@standard-schema/spec` as a runtime dependency.
