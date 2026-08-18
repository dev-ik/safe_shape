# Validation

`@safe-shape/validation` turns SafeShape parse results into JSON-friendly
validation reports.

## Validate

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

The report shape is designed for tool output, logs, generated validation
reports, and transport-safe API boundaries. It does not throw for validation
failures.

Native diagnostic codes are preserved, including `not_multiple_of` for exact
numeric increments and string issue codes at constrained record-key paths.
Record key and value issues may both be present for the same path.

When every ordinary union choice fails, its `invalid_union` issue preserves an
ordered recursive `branches` tree. Each branch retains its declaration index,
all issue codes, and full paths; the JSON-friendly report does not choose or
flatten a branch.

Object reports expose the actual parsed output: explicit `strip` omits extra
properties and `passthrough` preserves them. The default `reject` policy keeps
returning `unexpected_property` issues.

Addressable custom diagnostics pass through unchanged. Relative paths from
`refine()` and ordered multi-issue paths from `refineWithIssues()` remain
rooted at their containing schema and retain the `custom` code.

## API

```ts
function validateSchema<T>(schema: Schema<T>, input: unknown): ValidationReport<T>;

type ValidationReport<T> = ValidationSuccess<T> | ValidationFailure;

interface ValidationSuccess<T> {
  readonly valid: true;
  readonly data: T;
}

interface ValidationFailure {
  readonly valid: false;
  readonly issues: readonly Issue[];
}
```
