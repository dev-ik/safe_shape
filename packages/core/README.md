# @safe-shape/core

Runtime schemas, parsing, diagnostics, and type inference for SafeShape.

## Usage

```ts
import { object, string, union, literal } from "@safe-shape/core";

const userSchema = object({
  id: string(),
  role: union([literal("admin"), literal("member")]),
});

const result = userSchema.safeParse({
  id: "user_1",
  role: "admin",
});
```

SafeShape validates without hidden coercion and keeps schemas immutable.

Attach tooling metadata without changing runtime behavior:

```ts
const userIdSchema = string().annotate({
  title: "User id",
  description: "Stable public user identifier.",
});
```

See `docs/api/core.md` for the public API.
