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

`transform()` output types are emitted as `unknown` because mapper return types
are not available through runtime schema introspection.
