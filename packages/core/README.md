# @safe-shape/core

Runtime schemas, parsing, diagnostics, and type inference for SafeShape.

## Usage

```ts
import {
  discriminatedUnion,
  enum as enumSchema,
  integer,
  intersection,
  never as neverSchema,
  number,
  object,
  record,
  string,
  union,
  literal,
  lazy,
  describeContract,
  type InferInput,
  type InferOutput,
  unknown as unknownSchema,
} from "@safe-shape/core";

const userSchema = object({
  id: string({ minLength: 1, maxLength: 100 }),
  age: integer({ minimum: 0, maximum: 150 }).optional(),
  role: union([literal("admin"), literal("member")]),
});

const result = userSchema.safeParse({
  id: "user_1",
  role: "admin",
});

const standardResult = userSchema["~standard"].validate({
  id: "user_1",
  role: "admin",
});

const lengthSchema = string().transform((value) => value.length);
type LengthInput = InferInput<typeof lengthSchema>; // string
type LengthOutput = InferOutput<typeof lengthSchema>; // number

const statusSchema = enumSchema(["draft", "published"] as const);
const payloadSchema = unknownSchema();
const impossibleSchema = neverSchema();

const eventSchema = discriminatedUnion("type", [
  object({ type: literal("created"), id: string() }),
  object({ type: literal("deleted"), id: string() }),
] as const);
const boundedName = intersection(
  string({ minLength: 2 }),
  string({ maxLength: 100 }),
);
const emailSchema = string({ format: "email" });
const uuidSchema = string({ format: "uuid" });
const identifierSchema = string({ pattern: "^[a-z][a-z0-9_]+$" });
const amountSchema = number({ minimum: 0, multipleOf: 0.01 });
const countersSchema = record(number(), {
  key: { pattern: "^[a-z][a-z0-9_]*$", maxLength: 64 },
});
const extensibleUserSchema = object(
  { id: string() },
  { unknownProperties: "passthrough" },
);
```

SafeShape validates without hidden coercion and keeps schemas immutable.
Native string, number, integer, and array constraints remain visible to JSON
Schema and compatibility tooling.
`Schema<TOutput, TInput = TOutput>` preserves both sides of transforms while
the existing `Infer<TSchema>` helper remains an output alias.
Every schema also implements synchronous Standard Schema V1 through its frozen
`~standard` protocol object. `StandardSchemaV1.InferInput` and `InferOutput`
preserve the same transform-aware type sides without an adapter dependency.

Use `lazy(() => schema, { id })` for recursive contracts and
`describeContract(schema)` for deterministic input/output graphs with stable
definitions and references.

`schema.enum(...)`, `schema.unknown()`, and `schema.never()` provide explicit
closed, unconstrained, and impossible contract nodes without opaque refinements.
`enumeration(...)` is also exported as a non-reserved alias for `enum`.

`discriminatedUnion()` selects one tagged object branch and preserves its
diagnostics. `intersection()` validates both sides and rejects incompatible
successful outputs instead of applying an order-dependent merge.
When every ordinary `union()` choice fails, the `invalid_union` issue retains
all choice failures in an immutable recursive `branches` tree. Branch indexes
and order match the declared choices, and original paths are preserved.

String constraints support toolable Unicode-mode `pattern` sources and exact
`email`, `uuid`, `date`, and `date-time` formats. Invalid pattern syntax and
unknown format names fail eagerly.

Numeric `multipleOf` uses exact base-10 divisibility without an epsilon.
`record(value, { key })` applies native string constraints to keys without
coercion or renaming, while preserving value diagnostics.

Objects reject unknown properties by default. Explicit `strip` accepts and
omits extras, while explicit `passthrough` preserves them as unknown values.

Use `refine(..., { path })` for one addressable custom issue. Use the
synchronous `refineWithIssues(collector, { id })` when one stable semantic rule
must emit several ordered issues:

```ts
const periodSchema = object({ start: number(), end: number() }).refineWithIssues(
  (value, context) => {
    if (value.start > value.end) {
      context.addIssue({ path: ["start"], message: "Start must not exceed end." });
      context.addIssue({ path: ["end"], message: "End must not precede start." });
    }
  },
  { id: "ordered-period/v1" },
);
```

Relative paths compose with containing schemas. Custom rules stay opaque in
Contract IR and are rejected by JSON Schema exporters rather than approximated.
Async collectors, warnings, and arbitrary issue payloads are not supported.

Attach tooling metadata without changing runtime behavior:

```ts
const userIdSchema = string().annotate({
  title: "User id",
  description: "Stable public user identifier.",
});
```

See `docs/api/core.md` for the public API.
