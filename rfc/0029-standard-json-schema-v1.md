# RFC 0029: expose Standard JSON Schema V1 conversion

## Status

Accepted for the second standards-interoperability M4 slice.

## Motivation

Standard JSON Schema consumers need independent input and output artifacts from
a schema without understanding SafeShape's exporter API. SafeShape already has
side-aware Contract IR and JSON Schema conversion, but does not expose the
vendor-neutral `jsonSchema.input()` and `jsonSchema.output()` protocol.

## Proposal

`@safe-shape/json-schema` exports the structural `StandardJSONSchemaV1` types
and an explicit adapter:

```ts
const standard = createStandardJsonSchema(schema);

standard["~standard"].jsonSchema.input({ target: "draft-2020-12" });
standard["~standard"].jsonSchema.output({ target: "draft-2020-12" });
```

The returned immutable entity combines the schema's existing Standard Schema
V1 validation properties with an immutable Standard JSON Schema converter.
Its generic order is `<Input, Output>`, while the adapter accepts SafeShape's
existing output-first `Schema<Output, Input>`.

Input and output conversion delegate to `toJsonSchema()` with the corresponding
Contract IR side. This preserves explicit strip/passthrough semantics,
references, recursion, annotations, and current failures for opaque output.

This slice supports the Standard target `"draft-2020-12"` and emits the
official `https://json-schema.org/draft/2020-12/schema` URI. Other targets throw
a `TypeError`; Draft 7 support is the next separately reviewed M4 slice.
`libraryOptions` is accepted and ignored because no vendor-specific conversion
options are currently defined.

## Compatibility

The new function and types are additive. Existing `toJsonSchema()` behavior is
unchanged. Converter results remain deeply immutable according to the existing
exporter guarantees.

## Non-Goals

- Adding JSON Schema generation to `@safe-shape/core`.
- Mutating schemas or globally registering an exporter.
- Draft 7 or OpenAPI 3.0 conversion in this slice.
- Approximating opaque transform outputs.
- Replacing the existing `toJsonSchema()` API.
