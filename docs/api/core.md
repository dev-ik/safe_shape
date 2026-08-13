# Core API

SafeShape v1.0 exposes a stable runtime validation API for external boundary data.

## Builders

- `string()` validates string values.
- `number()` validates finite number values.
- `boolean()` validates boolean values.
- `literal(value)` validates an exact string, number, boolean, `null`, or `undefined` literal.
- `array(itemSchema)` validates arrays and reports element issues with numeric path segments.
- `tuple([schemaA, schemaB])` validates fixed-length positional arrays.
- `union([schemaA, schemaB])` validates input against one of several schema choices.
- `object(shape)` validates non-array objects with required properties from `shape`.
- `record(valueSchema)` validates non-array objects with string keys and shared value schema.
- `nullable(schema)` and `schema.nullable()` allow `null` values.
- `optional(schema)` and `schema.optional()` allow `undefined` values and omitted object fields.
- `annotate(schema, metadata)` and `schema.annotate(metadata)` attach tooling metadata.

Object schemas are strict by default. Unknown input properties produce `unexpected_property` issues.
SafeShape does not coerce values.

## Parsing

Every schema has:

- `safeParse(input)` returning `ParseResult<T>`.
- `parse(input)` returning `T` or throwing `ValidationError`.
- `refine(predicate, options)` returning a new schema with an additional runtime check.
- `transform(mapper, options)` returning a new schema with a mapped output type.
- `nullable()` returning a new nullable schema.
- `optional()` returning a new optional schema.
- `annotate(metadata)` returning a new annotated schema.

Schema instances are frozen. Schema operations return new schema instances and do not
mutate existing schemas.

## Results

`ParseResult<T>` is a discriminated union:

```ts
type ParseResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: ValidationError };
```

`ValidationError` contains immutable `issues`.

## Issues

Each issue contains:

- `code`
- `path`
- `expected`
- `received`
- `message`
- `suggestion`

Current issue codes are:

- `invalid_type`
- `invalid_literal`
- `invalid_tuple_length`
- `invalid_union`
- `transform_failed`
- `missing_property`
- `unexpected_property`
- `custom`

## Transforms

Use `.transform(mapper, options)` to explicitly map a successfully parsed value to a new
output type.

Transforms run after the input schema validates. They do not coerce raw input before
validation.

If the mapper throws, parsing fails with `transform_failed`.

```ts
const lengthSchema = string().transform((value) => value.length);

type Length = Infer<typeof lengthSchema>; // number
```

## Metadata

Use `annotate(schema, metadata)` or `schema.annotate(metadata)` to attach
tooling metadata without changing parse behavior.

```ts
const userIdSchema = string().annotate({
  title: "User id",
  description: "Stable public user identifier.",
  examples: ["user_1"],
});
```

Supported metadata fields:

- `title`
- `description`
- `examples`

Metadata is immutable and appears in `describeSchema(schema)` output. Tooling
packages can decide how to map it into their target artifact.

## Diagnostics

Use diagnostics helpers to convert issues into stable objects or readable strings:

- `createDiagnostic(issue)`
- `createDiagnostics(issues)`
- `formatIssuePath(path)`
- `formatDiagnostic(diagnostic)`
- `formatIssues(issues)`
- `formatValidationError(error)`

Example formatted diagnostic:

```txt
input.user.email: Expected a string. Expected string; received number. Suggestion: Pass a string value. (invalid_type)
```

## Type Inference

Use `Infer<typeof schema>` to get the TypeScript output type.

```ts
import {
  object,
  string,
  number,
  array,
  literal,
  union,
  tuple,
  record,
  nullable,
  type Infer,
} from "@safe-shape/core";

const userSchema = object({
  id: string(),
  age: number().optional(),
  roles: array(union([literal("admin"), literal("member")])),
  metadata: record(nullable(string())),
  point: tuple([number(), number()]),
});

type User = Infer<typeof userSchema>;
```

## Introspection

Use `describeSchema(schema)` to get a SafeShape schema description for tooling packages.

The description model is not JSON Schema. Exporter packages such as
`@safe-shape/json-schema` convert this neutral description into their target format.
