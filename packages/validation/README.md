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
Native string constraints preserve `invalid_string_pattern` and
`invalid_string_format` issue codes in failure reports.
Exact numeric multiples preserve `not_multiple_of`; constrained record keys
preserve string issue codes at the key path without suppressing value issues.
Explicit object strip/passthrough policies are reflected in successful report
data; reject remains the default.
Failed ordinary unions retain every choice's issues in an ordered recursive
`branches` tree instead of collapsing them into only a generic union error.
Addressable `custom` issues from `refine(..., { path })` and
`refineWithIssues()` preserve their relative paths and collector order.
