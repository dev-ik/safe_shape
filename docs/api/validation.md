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
