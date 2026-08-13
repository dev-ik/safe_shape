# @safe-shape/validation

JSON-friendly validation reports for SafeShape runtime contracts.

## Usage

```ts
import { object, string } from "@safe-shape/core";
import { validateSchema } from "@safe-shape/validation";

const userSchema = object({
  id: string(),
});

const report = validateSchema(userSchema, { id: "user_1" });
```

Success:

```ts
{
  valid: true,
  data: {
    id: "user_1",
  },
}
```

Failure:

```ts
{
  valid: false,
  issues: [],
}
```

Validation failures do not throw.
