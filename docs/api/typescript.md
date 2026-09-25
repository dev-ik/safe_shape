# TypeScript

`@safe-shape/typescript` generates TypeScript type declarations from SafeShape
runtime schemas.

## Generate Type

```ts
import { object, string, union, literal } from "@safe-shape/core";
import { toTypeScriptType } from "@safe-shape/typescript";

const userSchema = object({
  id: string(),
  role: union([literal("admin"), literal("member")]),
});

const source = toTypeScriptType(userSchema, { name: "User" });
```

Output:

```ts
export type User = {
  id: string;
  role: "admin" | "member";
};
```

`name` defaults to `SchemaOutput`.

Metadata annotations from `schema.annotate(...)` do not change generated
TypeScript types.

`enum()` generates a literal union, `unknown()` generates `unknown`, and
`never()` generates `never`.

`discriminatedUnion()` generates the union of its object choices.
`intersection()` generates a parenthesized TypeScript intersection.
String length, pattern, and format constraints remain the static type `string`.
Numeric `multipleOf` remains `number`, and record key constraints remain
`Readonly<Record<string, Value>>`; these rules affect runtime acceptance, not
the representable TypeScript primitive.
Object `reject` and `strip` output only declared properties. `passthrough`
adds `readonly [key: string]: unknown` without weakening known properties.

## Transform Types

`transform()` output types are emitted as `unknown` because mapper return types
are not available through runtime schema introspection.

## API

```ts
function toTypeScriptType(schema: Schema<any, any>, options?: TypeScriptTypeOptions): string;

interface TypeScriptTypeOptions {
  readonly name?: string;
  readonly side?: "input" | "output";
}
```

Since 3.2.0, the API supports recursive `lazy()` references, reuse
and mutual recursion through deterministic named declarations. Invalid or
unproductive alias cycles fail explicitly. `side: "input" | "output"` selects
the contract graph; output is the default. Opaque outputs remain `unknown`.
Existing acyclic default formatting is preserved. Versions before 3.2.0 reject
references.

On the input side, transforms retain their original input types and stripping
objects allow an `unknown` string index for accepted extra properties. On the
output side, stripping objects contain only declared fields; `pipe(next)` uses
the checked next-stage type. Generated types describe structure, not every
runtime constraint or the exact set of values a transform can produce.
