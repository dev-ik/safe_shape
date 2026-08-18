# RFC 0019: input and output schema types

## Status

Accepted for SafeShape 2.0 implementation.

## Motivation

The current `Schema<T>` type represents parsed output. That is sufficient for
validation-only schemas, but transforms need to expose both the value accepted
by their inner contract and the value produced after mapping. Standard Schema,
input/output artifact generation, and transform compatibility all depend on
this distinction.

The change must preserve the established meaning of `Schema<T>` and `Infer<T>`.

## Proposal

Extend the public schema type without changing runtime parsing:

```ts
interface Schema<TOutput, TInput = TOutput> {
  parse(input: unknown): TOutput;
  safeParse(input: unknown): ParseResult<TOutput>;
}

type InferOutput<TSchema extends Schema<any, any>> =
  TSchema extends Schema<infer TOutput, any> ? TOutput : never;

type InferInput<TSchema extends Schema<any, any>> =
  TSchema extends Schema<any, infer TInput> ? TInput : never;

type Infer<TSchema extends Schema<any, any>> = InferOutput<TSchema>;
```

Output remains the first parameter so existing annotations such as
`Schema<User>` retain their meaning. The input parameter defaults to output,
making the change source-compatible for schemas without transforms.

`parse()` and `safeParse()` continue to accept `unknown`. The input generic is
a static contract description, not permission to bypass runtime validation.

Transforms preserve the original input and replace only the output:

```ts
const length = string().transform((value) => value.length);

type LengthInput = InferInput<typeof length>;   // string
type LengthOutput = InferOutput<typeof length>; // number
```

Arrays, tuples, unions, objects, records, nullable schemas, and optional
schemas propagate input and output independently. Refinements and annotations
preserve both sides.

Object property optionality follows the explicit outer `.optional()` wrapper,
matching runtime behavior. A transform that happens to output `undefined` and
a required `literal(undefined)` property do not make that property omittable.
Annotations and refinements preserve explicit optionality.

## Compatibility

- `Schema<T>` continues to mean a schema whose output is `T`.
- `Infer<TSchema>` remains an alias for the output type.
- Existing builder calls and runtime behavior do not change.
- Packages accepting arbitrary schemas use `Schema<any, any>`.
- Object types that previously inferred omission from an incidental
  `undefined` output are corrected to require the property unless the schema is
  explicitly optional.

No snapshot-format change is included in this RFC. Contract IR v2 will define
how separate input and output descriptions are serialized and fingerprinted.

## Alternatives

- Use `Schema<TInput, TOutput>`. Rejected because it silently changes the
  meaning of the existing first generic parameter.
- Keep only `Schema<T>` and infer transform inputs through helper types.
  Rejected because composition loses the input side at schema boundaries.
- Change `parse()` to accept `TInput`. Rejected because external data is
  untrusted and must continue to enter validation as `unknown`.

## Non-Goals

- Contract IR v2 serialization.
- Standard Schema implementation.
- Input/output JSON Schema generation.
- New runtime coercion or transform behavior.
