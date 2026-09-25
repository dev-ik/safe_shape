# Parser

Validation pipeline: Input -> Parser -> Result -> Diagnostics.

## Parsing entry points

- `safeParse(input)` returns `ParseResult<T>`.
- `parse(input)` returns `T` or throws `ValidationError` for invalid data.
- `safeParseAsync(input)` returns `Promise<ParseResult<T>>`.
- `parseAsync(input)` returns `Promise<T>` or rejects for invalid data.

Synchronous entry points reject schemas containing async rules with `TypeError`
before parsing. Standard Schema validation selects sync or async execution from
the schema. An unexpected JavaScript exception, such as a throwing input getter,
still requires an application exception boundary; `safeParse` is not a global
catch-all. See [production boundaries](production-boundaries.md).

## Internal pipeline

The internal flow is:

1. The public entry point creates a root `ParseContext` carrying the issue path.
2. Each schema validates the input for its own runtime contract.
3. Object and array schemas create child contexts for property and index paths.
4. Schemas convert failures into issues with stable paths.
5. Since 3.2.0, traversal carries issues and warnings without allocating a native
   error at every failed nested node. The public boundary creates `ValidationError`
   once, with its ordinary message, stack and immutable diagnostic collections.

Successful results may carry warnings; failed results retain them on
`error.warnings`. Warnings never turn invalid input into success. Checked
`pipe(next)` stages run only after the preceding stage succeeds and preserve
diagnostic paths and warning order.

`ParseContext` and traversal results are private. See the
[core reference](api/core.md) for the public result types.
