# RFC 0005: transforms

## Motivation

Some boundary data needs explicit mapping after validation. SafeShape needs transforms
without introducing hidden coercion or changing what raw inputs are accepted by a schema.

## Proposal

Expose `.transform(mapper, options)` on every schema.

Transform behavior:

1. Validate the input with the original schema.
2. If validation succeeds, call `mapper(parsedValue)`.
3. Return the mapper output as the new schema output.
4. If the mapper throws, return one `transform_failed` issue at the current path.

Transforms are explicit. They do not coerce raw input before validation.

The inferred output type is the mapper return type.

Example:

```ts
const lengthSchema = string().transform((value) => value.length);
type Length = Infer<typeof lengthSchema>; // number
```

## Alternatives

- Add implicit coercion helpers such as automatic string-to-number parsing. This is
  rejected by ADR 0004.
- Treat mapper failures as thrown exceptions. This is rejected because parser behavior
  should return `ParseResult` failures consistently.

## Migration

No migration is required because transforms are an additive API.
