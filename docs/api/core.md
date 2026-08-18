# Core API

SafeShape exposes a stable runtime validation API for external boundary data.

## Builders

- `string(constraints?)` validates strings with optional length, pattern, and exact-format constraints.
- `number(constraints?)` validates finite number values and optional range/integer/multiple constraints.
- `integer(constraints?)` validates finite integer values and optional range/multiple constraints.
- `boolean()` validates boolean values.
- `literal(value)` validates an exact string, number, boolean, `null`, or `undefined` literal.
- `enum([valueA, valueB])` / `enumeration([valueA, valueB])` validates a closed non-empty set of string and finite-number values.
- `unknown()` accepts every value without cloning or coercion.
- `never()` rejects every value.
- `array(itemSchema, constraints?)` validates arrays, optional length constraints, and element schemas.
- `tuple([schemaA, schemaB])` validates fixed-length positional arrays.
- `union([schemaA, schemaB])` validates input against one of several schema choices.
- `discriminatedUnion(key, choices)` selects one object-schema choice by a required literal or enum property.
- `intersection(left, right)` requires both schemas and combines compatible outputs.
- `object(shape, options?)` validates non-array objects with required properties from `shape` and an explicit unknown-property policy.
- `record(valueSchema, constraints?)` validates non-array objects with optional string-key constraints and a shared value schema.
- `nullable(schema)` and `schema.nullable()` allow `null` values.
- `optional(schema)` and `schema.optional()` allow `undefined` values and omitted object fields.
- `lazy(getSchema, { id })` defines a reusable or recursive schema reference.
- `annotate(schema, metadata)` and `schema.annotate(metadata)` attach tooling metadata.

Object schemas use `unknownProperties: "reject"` by default. Unknown input
properties produce `unexpected_property` issues. Explicit `"strip"` accepts
and omits them; explicit `"passthrough"` preserves them unchanged. SafeShape
does not coerce values.

Because `enum` is a reserved JavaScript word, direct imports use an alias:

```ts
import {
  enum as enumSchema,
  never as neverSchema,
  unknown as unknownSchema,
} from "@safe-shape/core";

const status = enumSchema(["draft", "published"] as const);
```

`enumeration(...)` is the equivalent non-reserved named export.

The namespace form is `schema.enum(...)`, `schema.unknown()`, and
`schema.never()`. Enum values preserve literal-union inference and caller order
for runtime diagnostics; Contract IR sorts them canonically because order is
not semantic. Empty arrays, duplicate values, non-finite numbers, and negative
zero are rejected when the schema is constructed.

### Discriminated unions

Use `discriminatedUnion()` when a tagged object should select exactly one
branch and retain that branch's complete diagnostics:

```ts
const event = discriminatedUnion("type", [
  object({ type: literal("created"), id: string() }),
  object({ type: literal("deleted"), id: string() }),
] as const);
```

Choices must be object schemas. The discriminator must be required and use a
string or finite-number `literal()` or `enum()`. Values must be unique across
all branches. Missing and unknown tags produce `invalid_discriminator` at the
discriminator property path; a selected branch preserves its own issue codes
and paths.

### Ordinary union diagnostics

An ordinary `union()` still returns the first successful choice. When every
choice fails, the top-level `invalid_union` issue includes an ordered
`branches` array. Each branch contains its zero-based declaration `index` and
all original issues, including complete paths. Nested unions retain the same
recursive structure; no branch is silently selected or flattened.

### Intersections

`intersection(left, right)` validates the original input through both schemas.
Failures from both sides are retained in left-to-right order. Successful
outputs must be identical or recursively compatible arrays/plain records;
otherwise parsing fails with `intersection_conflict`. Newly merged containers
are frozen, and caller-owned values are not mutated.

Strict objects with disjoint shapes fail before intersection output merging.
Give both operands `unknownProperties: "strip"` when each side should validate
its own declared fields and the intersection should combine their outputs.

### Object unknown properties

```ts
const strict = object({ id: string() });
const stripped = object(
  { id: string() },
  { unknownProperties: "strip" },
);
const open = object(
  { id: string() },
  { unknownProperties: "passthrough" },
);
```

All policies validate declared properties first. `reject` reports extras,
`strip` explicitly removes them from output, and `passthrough` copies them as
unchanged `unknown` values. Output containers remain frozen; passthrough values
are not cloned or deep-frozen. Policy names are represented in Contract IR.
See RFC 0026 and ADR 0015 for artifact and compatibility semantics.

## Parsing

Every `Schema<TOutput, TInput = TOutput>` has:

- `safeParse(input)` returning `ParseResult<TOutput>`.
- `parse(input)` returning `TOutput` or throwing `ValidationError`.
- `refine(predicate, options)` returning a new schema with an additional runtime check.
- `refineWithIssues(collector, { id })` returning a new schema with an addressable multi-issue check.
- `transform(mapper, options)` returning a new schema with a mapped output type.
- `nullable()` returning a new nullable schema.
- `optional()` returning a new optional schema.
- `annotate(metadata)` returning a new annotated schema.

Schema instances are frozen. Schema operations return new schema instances and do not
mutate existing schemas.

## Standard Schema V1

Every SafeShape schema implements the vendor-neutral Standard Schema V1
protocol directly:

```ts
const result = userSchema["~standard"].validate(input);
```

The protocol has `version: 1`, `vendor: "safe-shape"`, and synchronous
validation. Success is an immutable `{ value }`; failure is an immutable
`{ issues }` using native frozen SafeShape issues. Standard consumers see the
required message and path, while SafeShape-aware consumers retain issue codes,
suggestions, and recursive union branches.

```ts
type Input = StandardSchemaV1.InferInput<typeof schema>;
type Output = StandardSchemaV1.InferOutput<typeof schema>;
```

Transforms preserve different Standard Schema input and output types.
`libraryOptions` is accepted but currently ignored. Validation never returns a
Promise, and the type-only `types` member is intentionally absent at runtime.
No `@standard-schema/spec` dependency is required because compatibility is
structural.

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
- optional `branches` for `invalid_union`

```ts
interface UnionIssueBranch {
  readonly index: number;
  readonly issues: readonly Issue[];
}
```

Issues, branch entries, branch issue arrays, and the `branches` array are
immutable. Branch indexes and order match the choices passed to `union()`.

Current issue codes are:

- `invalid_type`
- `invalid_literal`
- `invalid_enum`
- `invalid_string_pattern`
- `invalid_string_format`
- `forbidden_value`
- `invalid_tuple_length`
- `invalid_union`
- `invalid_discriminator`
- `intersection_conflict`
- `too_small`
- `too_large`
- `not_integer`
- `not_multiple_of`
- `transform_failed`
- `missing_property`
- `unexpected_property`
- `custom`

## Native Constraints

Use native constraints when compatibility tooling must understand a validation
rule:

```ts
const username = string({
  minLength: 3,
  maxLength: 40,
  pattern: "^[\\p{L}_][\\p{L}\\p{N}_]*$",
});
const email = string({ format: "email" });
const id = string({ format: "uuid" });
const birthday = string({ format: "date" });
const createdAt = string({ format: "date-time" });
const age = integer({ minimum: 0, maximum: 150 });
const amount = number({ minimum: 0, multipleOf: 0.01 });
const counters = record(integer(), {
  key: { pattern: "^[a-z][a-z0-9_]*$", maxLength: 64 },
});
const scores = array(number({ minimum: 0, maximum: 100 }), {
  minLength: 1,
  maxLength: 10,
});
```

String length is measured in Unicode code points. Bounds are inclusive.
Constraint configuration is validated when the schema is created, and
constraint objects are immutable in `describeSchema()` output.

`pattern` is an ECMAScript regular-expression source compiled in Unicode mode
without stateful flags. Invalid syntax fails when the schema is constructed.
Patterns are trusted contract code; do not build them from untrusted input.

Supported exact formats are `email`, `uuid`, `date`, and `date-time`. Email is
the documented ASCII dot-atom/DNS-label subset, not full RFC 5322 or
internationalized email. Date and date-time use calendar validation without
`Date.parse`; date-time requires a timezone and rejects leap seconds and
`24:00:00`. See RFC 0024 for the complete accepted grammar.

Length, pattern, and format issues accumulate as `too_small`/`too_large`,
`invalid_string_pattern`, and `invalid_string_format`.

`multipleOf` must be positive and finite. Divisibility is exact over the
shortest base-10 representation of each JavaScript number, without an epsilon:
`0.3` is a multiple of `0.1`, but `0.30000000000000004` is not. Failures use
`not_multiple_of` and accumulate with range and integer issues.

`record(..., { key })` accepts the same `minLength`, `maxLength`, `pattern`, and
`format` constraints as `string()`. Keys are checked without coercion or
renaming; key and value issues can both be returned at the key's path. See RFC
0025 and ADR 0014 for the complete semantics.

Use `refine()` only when a rule cannot be represented natively. Opaque
refinements require a stable semantic id for compatibility checks.

## Addressable Custom Diagnostics

Use the optional relative `path` on `refine()` for a single cross-field issue:

```ts
const credentialsSchema = object({
  password: string(),
  confirmation: string(),
}).refine(
  (value) => value.password === value.confirmation,
  {
    id: "password-confirmation/v1",
    path: ["confirmation"],
    message: "Passwords must match.",
  },
);
```

Use `refineWithIssues()` when one synchronous rule can emit zero or more
issues:

```ts
const periodSchema = object({
  start: number(),
  end: number(),
}).refineWithIssues((value, context) => {
  if (value.start > value.end) {
    context.addIssue({
      path: ["start"],
      message: "Start must not exceed end.",
    });
    context.addIssue({
      path: ["end"],
      message: "End must not precede start.",
      suggestion: "Swap the range boundaries.",
    });
  }
}, { id: "ordered-period/v1" });
```

Collector paths are relative to the refined schema and are prefixed by nested
objects, arrays, and HTTP sections. Issues keep `addIssue()` order, use code
`custom`, and have copied frozen paths. The stable rule id is required and is
stored as opaque Contract IR behavior.

Collectors are synchronous. Returning a promise-like value or throwing creates
a deterministic custom failure without exposing the thrown value. Every
collected issue is an error; async refinements, warning-only diagnostics, and
arbitrary issue payloads are outside the 2.0 API.

## Transforms

Use `.transform(mapper, options)` to explicitly map a successfully parsed value to a new
output type.

Transforms run after the input schema validates. They do not coerce raw input before
validation.

If the mapper throws, parsing fails with `transform_failed`.

```ts
const lengthSchema = string().transform((value) => value.length, {
  id: "string-length/v1",
});

type Length = Infer<typeof lengthSchema>; // number
type LengthInput = InferInput<typeof lengthSchema>; // string
type LengthOutput = InferOutput<typeof lengthSchema>; // number
```

Transforms replace the output type while preserving the original input type.
Chained transforms continue to retain the input of the first schema.

`refine()` and `transform()` accept an optional stable `id`;
`refineWithIssues()` requires one. Runtime parsing does not interpret the id;
schema introspection and compatibility tooling use it to identify versioned
opaque behavior. Anonymous opaque behavior is valid for ordinary parsing but
cannot be proven compatible from a stored snapshot.

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

Failed ordinary unions keep that summary line and append indented
`Union branch N:` sections recursively. `Diagnostic.branches` exposes the same
tree for structured consumers.

## Type Inference

Use `InferInput<typeof schema>` and `InferOutput<typeof schema>` to inspect both
sides of a contract. `Infer<typeof schema>` remains an output alias for source
compatibility.

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
  type InferInput,
  type InferOutput,
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

The output generic remains first: `Schema<TOutput, TInput = TOutput>`. Existing
annotations such as `Schema<User>` therefore keep their established meaning.
`parse()` and `safeParse()` still accept `unknown`; the input generic describes
composition and interoperability, not trusted runtime input.

## Introspection

Use `describeSchema(schema)` to get a SafeShape schema description for tooling packages.

The description model is not JSON Schema. Exporter packages such as
`@safe-shape/json-schema` convert this neutral description into their target format.

Descriptions expose refinement ids (or `null` for anonymous refinements) and
transform ids so tooling does not silently treat opaque behavior as structural.

Use `describeContract(schema)` for Contract IR v2. It returns deterministic,
immutable input and output graphs:

```ts
const contract = describeContract(schema);

contract.format; // "safe-shape.contract-ir/v2"
contract.input.root;
contract.input.definitions;
contract.output.root;
contract.output.definitions;
```

Transform pipelines remain explicit on the input side. Because mapper output
structure is erased at runtime, the output side uses an explicit `opaque` node.

## Recursive Schemas

`lazy()` requires a stable id and caches the schema returned by its getter:

```ts
interface TreeNode {
  readonly name: string;
  readonly children: readonly TreeNode[];
}

let treeSchema: Schema<TreeNode>;
treeSchema = lazy(
  () => object({
    name: string(),
    children: array(treeSchema),
  }),
  { id: "TreeNode" },
);
```

Contract IR represents lazy occurrences with `reference` nodes and stores the
target once in the graph's sorted `definitions`. Different lazy schemas cannot
claim the same id in one graph. Direct self-resolution without a concrete
container is rejected.

`describeSchema()` remains the legacy tree API and returns only a reference for
a lazy schema. Use `describeContract()` whenever definitions are required.

Contract IR v2 adds `enum`, `unknown`, `never`, `reference`, and `opaque`
variants to `SchemaDefinition`. Consumers with exhaustive switches must handle
the new explicit variants as part of their 2.0 migration.
