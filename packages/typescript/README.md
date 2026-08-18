# @safe-shape/typescript

TypeScript declaration generation for SafeShape runtime contracts.

## Usage

```ts
import { object, string } from "@safe-shape/core";
import { toTypeScriptType } from "@safe-shape/typescript";

const userSchema = object({
  id: string(),
});

const source = toTypeScriptType(userSchema, { name: "User" });
```

Output:

```ts
export type User = {
  id: string;
};
```

`name` defaults to `SchemaOutput`.

Metadata annotations from `schema.annotate(...)` do not change generated
TypeScript types.

`enum()` generates a literal union, `unknown()` generates `unknown`, and
`never()` generates `never`.

`discriminatedUnion()` generates a union of its choices, and `intersection()`
generates a parenthesized intersection.

String length, pattern, and format constraints generate the primitive
TypeScript type `string`.
Numeric `multipleOf` remains `number`, and constrained record keys remain
`Readonly<Record<string, Value>>`.
Passthrough objects add a readonly `unknown` string index; reject and strip
objects keep only their declared output properties.

`transform()` output types are emitted as `unknown` because mapper return types
are not available through runtime schema introspection.

Recursive `lazy()` references are rejected until graph-aware declaration
generation is implemented.
