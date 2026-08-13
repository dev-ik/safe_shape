# Parser

Validation pipeline: Input -> Parser -> Result -> Diagnostics.

## v0.2 Internal Pipeline

The core package uses an internal `ParseContext` to carry the current issue path while
schemas validate input.

The public parsing API remains:

- `safeParse(input)` for `ParseResult<T>`.
- `parse(input)` for `T` or `ValidationError`.

The internal flow is:

1. `safeParse(input)` creates a root parse context.
2. Each schema validates the input for its own runtime contract.
3. Object and array schemas create child contexts for property and index paths.
4. Schemas convert failures into issues with stable paths.
5. Issues are returned through `ValidationError` and can be rendered as diagnostics.

`ParseContext` is not exported from the public package entry point.
