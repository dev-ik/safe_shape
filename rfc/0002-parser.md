# RFC 0002: parser

## Motivation

SafeShape needs a single internal parsing pipeline so nested schemas report stable issue
paths and parsing stays separated from diagnostic rendering.

## Proposal

Use an internal parse context for schema validation.

The context carries:

- the current issue path;
- child context creation for object properties and array indexes;
- issue construction at the current path.

The public API remains `safeParse(input)` and `parse(input)`.

`ParseContext` is internal and is not exported from the package entry point.

## Alternatives

- Pass raw path arrays through every schema method. This works, but duplicates path
  handling in each schema implementation.
- Make parser context public in v0.2. This is deferred until there is a stable extension
  API that requires it.

## Migration

No user migration is required because the parser context is internal.
