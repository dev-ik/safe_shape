# RFC 0014: Validation reports

## Motivation

SafeShape core already exposes `safeParse`, but tooling and generated artifacts
need a smaller JSON-friendly report shape that does not include `ValidationError`
objects.

## Proposal

Add `@safe-shape/validation` with:

```ts
validateSchema(schema, input)
```

The function returns:

```ts
{ valid: true, data }
```

or:

```ts
{ valid: false, issues }
```

The function does not throw for validation failures. It may still throw if a
caller passes an invalid schema object outside the public type contract.

## Package Boundary

`@safe-shape/validation` depends only on `@safe-shape/core`.

The CLI uses this package for `schema validate` and adds CLI-specific metadata
and `ok` status around the report.

## Alternatives

- Keep validation report shaping inside `@safe-shape/cli`. This prevents
  programmatic use and duplicates future integration work.
- Add the helper directly to core. This would expand core beyond primitive
  runtime parsing and make tooling concerns less separable.

## Migration

No migration is required. Existing CLI output is preserved.
