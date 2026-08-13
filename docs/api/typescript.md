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

## Transform Types

`transform()` output types are emitted as `unknown` because mapper return types
are not available through runtime schema introspection.

## API

```ts
function toTypeScriptType(schema: Schema<any>, options?: TypeScriptTypeOptions): string;

interface TypeScriptTypeOptions {
  readonly name?: string;
}
```
