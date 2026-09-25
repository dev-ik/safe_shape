# Migrating schemas from Zod

SafeShape 3.2.0 adds object composition and checked pipelines. Migrate one
boundary first, compare accepted values and produced outputs, then expand.
The repository's quality fixtures pin the comparison version in
[`quality/package.json`](../quality/package.json).

| Zod | SafeShape | Review |
| --- | --- | --- |
| `z.object(shape)` | `object(shape, { unknownProperties: "strip" })` | SafeShape's default is reject |
| `z.strictObject(shape)` | `object(shape)` | Unknown fields fail |
| `z.looseObject(shape)` | `object(shape, { unknownProperties: "passthrough" })` | Extra fields retain unknown values |
| `.pick({ id: true })` | `.pick(["id"])` | Explicit field-name array |
| `.partial()` / `.required()` | `.partial()` / `.required()` | Shallow; compose before object rules |
| `.extend(shape)` | `.extend(shape)` | SafeShape rejects replacement of existing fields |
| `.transform(fn).pipe(next)` | `.transform(fn).pipe(next)` | Output is validated; conversion stays explicit |
| `z.infer` / `z.input` / `z.output` | `Infer` / `InferInput` / `InferOutput` | Compile real consumers |
| `.refine(async fn)` | `.refineAsync(fn, { id })` | Use explicit async entry points |

Do not assume all similarly named rules have identical semantics. SafeShape
string lengths count Unicode code points, which differs from UTF-16 length.
Built-in formats have their own precise contracts. SafeShape results and schema
containers are immutable; diagnostics, unknown-key defaults and inferred readonly
collections differ. Native warnings may be ignored by third-party resolvers;
read them through the native result when the application needs them.

## Restricted source migration tool

From a built repository checkout with development and quality dependencies:

```sh
node scripts/migrate-zod.mjs --input ./schemas.ts --out ./schemas.safe.ts
npm run migration:check
```

This optional repository tool uses the development TypeScript compiler; it adds
no dependency to core or the published CLI. It parses source without importing
or executing it. The input must be a schema-only module with `import { z }` or
`import * as z` from `zod`/`zod/v4`, const schema declarations, and optionally
infer/input/output type aliases. Supported builders are string, number, boolean,
unknown, never, JSON literals, unique string enums, arrays, tuples, unions,
objects with explicit preserved policy, optional and nullable. It supports
non-repeated numeric/array min/max bounds and earlier schema references.

Callbacks, coercion, defaults, zero literals (different -0 equality), string
bounds/formats, `.int()`, lazy schemas,
object composition methods, dynamic expressions/imports and other unsupported
constructs return line/column diagnostics for manual migration. No partial source
artifact is emitted when any statement is unsupported. The output file must be
new and separate from the input; an existing file is never overwritten. Without
`--out`, JSON stdout contains the proposed source. Exit codes are 0 for generated
source, 2 for manual migration and 1 for I/O/usage errors.

Review generated code before adoption. Differential tests compare supported
acceptance and successful output values, not identical library-specific errors.

## Integration journeys

- Run [connected-contracts.mjs](../examples/connected-contracts.mjs) after building
  for composition, request/response validation, recursive types and connection CI.
- [quality/form.mjs](../quality/form.mjs) exercises the real React Hook Form
  Standard Schema resolver with composed schemas, checked transforms, nested
  errors, async failures and native warnings. `npm run quality:check` builds its
  browser example under `.tmp/quality/browser/`; serve that directory to inspect it.
- The quality harness installs release tarballs into separate form/server/CI
  consumers. Its VM and scripted checks are not a human browser walkthrough or
  evidence of production adoption.
