import assert from "node:assert/strict";
import test from "node:test";
import {
  ValidationError,
  array,
  annotate,
  boolean,
  createDiagnostic,
  createDiagnostics,
  describeContract,
  describeSchema,
  discriminatedUnion,
  enum as enumSchema,
  enumeration,
  formatDiagnostic,
  formatIssuePath,
  formatIssues,
  formatValidationError,
  integer,
  intersection,
  lazy,
  literal,
  nullable,
  never as neverSchema,
  number,
  object,
  record,
  schema,
  string,
  tuple,
  union,
  unknown as unknownSchema,
  SCHEMA_CONTRACT_FORMAT,
  type Infer,
  type InferInput,
  type InferOutput,
  type Issue,
  type Schema,
  type StandardSchemaV1,
} from "../src/index.js";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;

type Expect<Value extends true> = Value;

test("primitive schemas validate without coercion", () => {
  assert.deepEqual(string().safeParse("hello"), { success: true, data: "hello" });
  assert.deepEqual(boolean().safeParse(false), { success: true, data: false });
  assert.deepEqual(number().safeParse(42), { success: true, data: 42 });

  const stringResult = string().safeParse(123);
  assert.equal(stringResult.success, false);
  assert.equal(stringResult.error.issues[0]?.code, "invalid_type");
  assert.equal(stringResult.error.issues[0]?.received, "number");

  const numberResult = number().safeParse(Number.NaN);
  assert.equal(numberResult.success, false);
  assert.equal(numberResult.error.issues[0]?.received, "NaN");

  const infinityResult = number().safeParse(Number.POSITIVE_INFINITY);
  assert.equal(infinityResult.success, false);
  assert.equal(infinityResult.error.issues[0]?.received, "Infinity");

  assert.equal(string().safeParse(null).success, false);
  assert.equal(boolean().safeParse("false").success, false);
  assert.equal(number().safeParse("42").success, false);
});

test("native string constraints count Unicode code points", () => {
  const constrained = string({ minLength: 2, maxLength: 3 });

  assert.deepEqual(constrained.safeParse("😀a"), { success: true, data: "😀a" });

  const short = constrained.safeParse("😀");
  assert.equal(short.success, false);
  assert.deepEqual(short.error.issues[0], {
    code: "too_small",
    path: [],
    expected: "string length >= 2",
    received: "1 code points",
    message: "Expected a string with at least 2 code points.",
    suggestion: "Pass a longer string.",
  });

  const long = constrained.safeParse("abcd");
  assert.equal(long.success, false);
  assert.equal(long.error.issues[0]?.code, "too_large");
});

test("string patterns validate in Unicode mode and remain toolable", () => {
  const identifier = string({ pattern: "^[\\p{L}_][\\p{L}\\p{N}_]*$" });

  assert.deepEqual(identifier.safeParse("имя_1"), {
    success: true,
    data: "имя_1",
  });

  const result = identifier.safeParse("1-name");
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0], {
    code: "invalid_string_pattern",
    path: [],
    expected: "string matching /^[\\p{L}_][\\p{L}\\p{N}_]*$/u",
    received: "string not matching pattern",
    message: "Expected a string matching /^[\\p{L}_][\\p{L}\\p{N}_]*$/u.",
    suggestion: "Pass a string that matches the declared pattern.",
  });

  const definition = describeSchema(identifier);
  assert.deepEqual(definition, {
    kind: "string",
    constraints: { pattern: "^[\\p{L}_][\\p{L}\\p{N}_]*$" },
  });
  assert.equal(definition.kind === "string" && Object.isFrozen(definition.constraints), true);
});

test("string formats validate deterministic wire representations", () => {
  const email = string({ format: "email" });
  assert.equal(email.safeParse("first.last+tag@example-domain.com").success, true);
  assert.equal(email.safeParse("user@localhost").success, true);
  assert.equal(email.safeParse("first..last@example.com").success, false);
  assert.equal(email.safeParse("user@-example.com").success, false);
  assert.equal(email.safeParse("пользователь@example.com").success, false);

  const uuid = string({ format: "uuid" });
  assert.equal(uuid.safeParse("550e8400-e29b-41d4-a716-446655440000").success, true);
  assert.equal(uuid.safeParse("00000000-0000-0000-0000-000000000000").success, true);
  assert.equal(uuid.safeParse("550e8400e29b41d4a716446655440000").success, false);

  const date = string({ format: "date" });
  assert.equal(date.safeParse("2024-02-29").success, true);
  assert.equal(date.safeParse("2023-02-29").success, false);
  assert.equal(date.safeParse("2024-13-01").success, false);

  const dateTime = string({ format: "date-time" });
  assert.equal(dateTime.safeParse("2024-02-29T23:59:59.123Z").success, true);
  assert.equal(dateTime.safeParse("2024-02-29t23:59:59-00:00").success, true);
  assert.equal(dateTime.safeParse("2024-02-29T24:00:00Z").success, false);
  assert.equal(dateTime.safeParse("2024-02-29T23:59:60Z").success, false);
  assert.equal(dateTime.safeParse("2024-02-29T23:59:59").success, false);
});

test("string constraints accumulate length pattern and format diagnostics", () => {
  const constrained = string({
    minLength: 10,
    pattern: "^admin@",
    format: "email",
  });
  const result = constrained.safeParse("x");

  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues.map((issue) => issue.code), [
    "too_small",
    "invalid_string_pattern",
    "invalid_string_format",
  ]);
  assert.equal(result.error.issues[2]?.expected, "string format email");
});

test("string pattern and format configuration is validated eagerly", () => {
  assert.throws(() => string({ pattern: "[" }), /valid ECMAScript regular expression/);
  assert.throws(
    () => string({ pattern: 10 as unknown as string }),
    /pattern must be a string/,
  );
  assert.throws(
    () => string({ format: "uri" as unknown as "email" }),
    /String format must be one of/,
  );
});

test("native number constraints enforce inclusive ranges and integers", () => {
  const constrained = number({ minimum: 1, maximum: 3, integer: true });

  assert.deepEqual(constrained.safeParse(1), { success: true, data: 1 });
  assert.deepEqual(constrained.safeParse(3), { success: true, data: 3 });

  const fractional = constrained.safeParse(1.5);
  assert.equal(fractional.success, false);
  assert.equal(fractional.error.issues[0]?.code, "not_integer");

  const small = constrained.safeParse(0);
  assert.equal(small.success, false);
  assert.equal(small.error.issues[0]?.code, "too_small");

  const large = integer({ maximum: 3 }).safeParse(4);
  assert.equal(large.success, false);
  assert.equal(large.error.issues[0]?.code, "too_large");
});

test("multipleOf uses exact decimal divisibility without epsilon", () => {
  const tenths = number({ multipleOf: 0.1 });

  assert.deepEqual(tenths.safeParse(0.3), { success: true, data: 0.3 });
  assert.deepEqual(tenths.safeParse(-0.3), { success: true, data: -0.3 });
  assert.deepEqual(tenths.safeParse(0), { success: true, data: 0 });
  assert.equal(number({ multipleOf: 1e-8 }).safeParse(1.1e-7).success, true);

  const result = tenths.safeParse(0.30000000000000004);
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0], {
    code: "not_multiple_of",
    path: [],
    expected: "number multiple of 0.1",
    received: "number not matching multiple",
    message: "Expected a number divisible by 0.1.",
    suggestion: "Pass an exact decimal multiple of 0.1.",
  });
  assert.deepEqual(describeSchema(tenths), {
    kind: "number",
    constraints: { multipleOf: 0.1 },
  });
});

test("numeric constraints accumulate integer range and multiple issues", () => {
  const result = integer({ minimum: 10, multipleOf: 3 }).safeParse(4.5);

  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues.map((issue) => issue.code), [
    "not_integer",
    "too_small",
    "not_multiple_of",
  ]);
});

test("multipleOf configuration rejects non-positive and non-finite steps", () => {
  assert.throws(() => number({ multipleOf: 0 }), /positive finite number/);
  assert.throws(() => number({ multipleOf: -0 }), /positive finite number/);
  assert.throws(() => number({ multipleOf: -1 }), /positive finite number/);
  assert.throws(() => number({ multipleOf: Number.NaN }), /positive finite number/);
  assert.throws(() => number({ multipleOf: Number.POSITIVE_INFINITY }), /positive finite number/);
});

test("native array constraints compose with item validation", () => {
  const constrained = array(string(), { minLength: 2, maxLength: 3 });

  assert.deepEqual(constrained.safeParse(["a", "b"]), {
    success: true,
    data: ["a", "b"],
  });

  const result = constrained.safeParse([1]);
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues.map((issue) => [issue.code, issue.path]), [
    ["too_small", []],
    ["invalid_type", [0]],
  ]);
});

test("native constraint configuration is validated eagerly", () => {
  assert.throws(() => string({ minLength: -1 }), /non-negative safe integer/);
  assert.throws(() => string({ minLength: 2, maxLength: 1 }), /must not exceed/);
  assert.throws(() => array(string(), { maxLength: 1.5 }), /non-negative safe integer/);
  assert.throws(() => number({ minimum: Number.NEGATIVE_INFINITY }), /must be finite/);
  assert.throws(() => number({ minimum: 2, maximum: 1 }), /must not exceed/);
  assert.throws(
    () => integer({ minimum: 0.1, maximum: 0.9 }),
    /must include at least one integer/,
  );
});

test("schema descriptions preserve immutable native constraints", () => {
  const definition = describeSchema(object({
    name: string({ minLength: 1, maxLength: 100 }),
    age: integer({ minimum: 0, maximum: 150 }),
    tags: array(string(), { maxLength: 10 }),
  }));

  assert.deepEqual(definition, {
    kind: "object",
    required: ["name", "age", "tags"],
    unknownProperties: "reject",
    shape: {
      name: { kind: "string", constraints: { minLength: 1, maxLength: 100 } },
      age: { kind: "number", constraints: { minimum: 0, maximum: 150, integer: true } },
      tags: { kind: "array", item: { kind: "string" }, constraints: { maxLength: 10 } },
    },
  });

  assert.equal(definition.kind, "object");
  if (definition.kind === "object") {
    const name = definition.shape.name;
    assert.equal(name?.kind, "string");
    if (name?.kind === "string") assert.equal(Object.isFrozen(name.constraints), true);
  }
});

test("literal schemas require exact values", () => {
  const statusSchema = literal("ok");

  assert.equal(statusSchema.parse("ok"), "ok");

  const result = statusSchema.safeParse("error");
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.code, "invalid_literal");
  assert.equal(result.error.issues[0]?.expected, "\"ok\"");
});

test("enum schemas preserve literal inference and validate closed scalar sets", () => {
  const statusSchema = enumSchema(["draft", "published", 1] as const);
  type Status = Infer<typeof statusSchema>;
  type StatusExpectation = Expect<Equal<Status, "draft" | "published" | 1>>;
  const typeExpectation: StatusExpectation = true;

  assert.equal(typeExpectation, true);
  assert.deepEqual(statusSchema.safeParse("draft"), { success: true, data: "draft" });
  assert.deepEqual(statusSchema.safeParse(1), { success: true, data: 1 });

  const result = statusSchema.safeParse("archived");
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0], {
    code: "invalid_enum",
    path: [],
    expected: "\"draft\" | \"published\" | 1",
    received: "string",
    message: "Expected one of \"draft\" | \"published\" | 1.",
    suggestion: "Pass one of the declared enum values.",
  });

  const definition = describeSchema(statusSchema);
  assert.deepEqual(definition, {
    kind: "enum",
    values: ["draft", "published", 1],
  });
  assert.equal(definition.kind === "enum" && Object.isFrozen(definition.values), true);
});

test("enum schema configuration fails eagerly for ambiguous values", () => {
  assert.throws(
    () => enumeration([] as unknown as readonly [string, ...string[]]),
    /non-empty array/,
  );
  assert.throws(() => enumeration(["draft", "draft"]), /must be unique/);
  assert.throws(() => enumeration([Number.NaN]), /strings or finite numbers/);
  assert.throws(() => enumeration([-0]), /negative zero/);
  assert.throws(
    () => enumeration([true] as unknown as readonly [string, ...string[]]),
    /strings or finite numbers/,
  );
});

test("unknown accepts values unchanged while never rejects every value", () => {
  const payload = { nested: [1, 2, 3] };
  const acceptedSchema = unknownSchema();
  const rejectedSchema = neverSchema();
  const accepted = acceptedSchema.safeParse(payload);
  assert.equal(accepted.success, true);
  assert.equal(accepted.data, payload);

  const rejected = rejectedSchema.safeParse(payload);
  assert.equal(rejected.success, false);
  assert.deepEqual(rejected.error.issues[0], {
    code: "forbidden_value",
    path: [],
    expected: "never",
    received: "object",
    message: "This schema accepts no values.",
    suggestion: "Use a schema that accepts the intended value.",
  });

  type UnknownOutput = Expect<Equal<Infer<typeof acceptedSchema>, unknown>>;
  type NeverOutput = Expect<Equal<Infer<typeof rejectedSchema>, never>>;
  const unknownExpectation: UnknownOutput = true;
  const neverExpectation: NeverOutput = true;
  assert.equal(unknownExpectation, true);
  assert.equal(neverExpectation, true);
});

test("object schemas validate required fields and reject unknown fields", () => {
  const userSchema = object({
    id: string(),
    age: number(),
  });

  assert.deepEqual(userSchema.parse({ id: "user_1", age: 36 }), {
    id: "user_1",
    age: 36,
  });

  const result = userSchema.safeParse({ id: 10, extra: true });
  assert.equal(result.success, false);
  assert.deepEqual(
    result.error.issues.map((issue) => [issue.code, issue.path]),
    [
      ["invalid_type", ["id"]],
      ["missing_property", ["age"]],
      ["unexpected_property", ["extra"]],
    ],
  );
});

test("object unknown-property policies strip or preserve extra values explicitly", () => {
  const extra = Object.freeze({ nested: true });
  const stripped = object(
    { id: string() },
    { unknownProperties: "strip" },
  ).parse({ id: "user_1", extra });
  const passedThrough = object(
    { id: string() },
    { unknownProperties: "passthrough" },
  ).parse({ id: "user_1", extra });

  assert.deepEqual(stripped, { id: "user_1" });
  assert.deepEqual(passedThrough, { id: "user_1", extra });
  assert.equal(passedThrough.extra, extra);
  assert.equal(Object.isFrozen(stripped), true);
  assert.equal(Object.isFrozen(passedThrough), true);
});

test("passthrough objects preserve prototype-like keys as own data", () => {
  const input = JSON.parse('{"id":"user_1","__proto__":{"safe":true}}') as Record<string, unknown>;
  const output = object(
    { id: string() },
    { unknownProperties: "passthrough" },
  ).parse(input);

  assert.equal(Object.prototype.hasOwnProperty.call(output, "__proto__"), true);
  assert.deepEqual(output.__proto__, { safe: true });
  assert.equal(Object.getPrototypeOf(output), Object.prototype);
});

test("strip policies allow disjoint object intersections", () => {
  const schema = intersection(
    object({ id: string() }, { unknownProperties: "strip" }),
    object({ active: boolean() }, { unknownProperties: "strip" }),
  );

  assert.deepEqual(schema.parse({ id: "user_1", active: true }), {
    id: "user_1",
    active: true,
  });
});

test("object policies are reflected in types and Contract IR", () => {
  const passthrough = object(
    { id: string() },
    { unknownProperties: "passthrough" },
  );
  const parsed = passthrough.parse({ id: "user_1", extra: 42 });
  const extra: unknown = parsed.extra;

  assert.equal(extra, 42);
  assert.deepEqual(describeSchema(passthrough), {
    kind: "object",
    shape: { id: { kind: "string" } },
    required: ["id"],
    unknownProperties: "passthrough",
  });
  assert.throws(
    () => object({}, { unknownProperties: "drop" as "strip" }),
    /must be "reject", "strip", or "passthrough"/,
  );
});

test("object schemas reject null and arrays", () => {
  const userSchema = object({ id: string() });

  const nullResult = userSchema.safeParse(null);
  assert.equal(nullResult.success, false);
  assert.equal(nullResult.error.issues[0]?.received, "null");

  const arrayResult = userSchema.safeParse([]);
  assert.equal(arrayResult.success, false);
  assert.equal(arrayResult.error.issues[0]?.received, "array");
});

test("nested schemas preserve full issue paths", () => {
  const projectSchema = object({
    owner: object({
      id: string(),
      contacts: array(
        object({
          email: string(),
          primary: boolean(),
        }),
      ),
    }),
  });

  const result = projectSchema.safeParse({
    owner: {
      id: 123,
      contacts: [
        { email: "dev@example.com", primary: true },
        { email: 50, unexpected: "value" },
      ],
    },
  });

  assert.equal(result.success, false);
  assert.deepEqual(
    result.error.issues.map((issue) => [issue.code, issue.path]),
    [
      ["invalid_type", ["owner", "id"]],
      ["invalid_type", ["owner", "contacts", 1, "email"]],
      ["missing_property", ["owner", "contacts", 1, "primary"]],
      ["unexpected_property", ["owner", "contacts", 1, "unexpected"]],
    ],
  );
});

test("array schemas preserve element paths in issues", () => {
  const result = array(string()).safeParse(["a", 1, "c"]);

  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.code, "invalid_type");
  assert.deepEqual(result.error.issues[0]?.path, [1]);
});

test("tuple schemas validate fixed positional arrays", () => {
  const pointSchema = tuple([number(), number()]);

  assert.deepEqual(pointSchema.parse([10, 20]), [10, 20]);
});

test("tuple schemas report item paths and length failures", () => {
  const pairSchema = tuple([string(), number()]);

  const itemResult = pairSchema.safeParse(["x", "2"]);
  assert.equal(itemResult.success, false);
  assert.deepEqual(itemResult.error.issues[0], {
    code: "invalid_type",
    path: [1],
    expected: "finite number",
    received: "string",
    message: "Expected a finite number.",
    suggestion: "Pass a number value without coercion.",
  });

  const lengthResult = pairSchema.safeParse(["x"]);
  assert.equal(lengthResult.success, false);
  assert.deepEqual(lengthResult.error.issues[0], {
    code: "invalid_tuple_length",
    path: [],
    expected: "2 items",
    received: "1 items",
    message: "Expected tuple with 2 items.",
    suggestion: "Pass exactly 2 items.",
  });
});

test("union schemas accept the first matching choice", () => {
  const idSchema = union([string(), number()]);

  assert.deepEqual(idSchema.safeParse("user_1"), { success: true, data: "user_1" });
  assert.deepEqual(idSchema.safeParse(100), { success: true, data: 100 });

  const literalUnion = union([literal("draft"), literal("published")]);
  assert.equal(literalUnion.parse("published"), "published");
});

test("union schemas report a stable issue when no choices match", () => {
  const idSchema = union([string(), number()]);
  const result = idSchema.safeParse(false);

  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0], {
    code: "invalid_union",
    path: [],
    expected: "string | number",
    received: "boolean",
    message: "Expected input to match one union choice.",
    suggestion: "Pass a value that satisfies one of the union schemas.",
    branches: [
      {
        index: 0,
        issues: [{
          code: "invalid_type",
          path: [],
          expected: "string",
          received: "boolean",
          message: "Expected a string.",
          suggestion: "Pass a string value.",
        }],
      },
      {
        index: 1,
        issues: [{
          code: "invalid_type",
          path: [],
          expected: "finite number",
          received: "boolean",
          message: "Expected a finite number.",
          suggestion: "Pass a number value without coercion.",
        }],
      },
    ],
  });
});

test("union schemas preserve nested object paths", () => {
  const eventSchema = object({
    id: string(),
    payload: union([
      object({ kind: literal("text"), value: string() }),
      object({ kind: literal("count"), value: number() }),
    ]),
  });

  const result = eventSchema.safeParse({
    id: "evt_1",
    payload: {
      kind: "other",
      value: true,
    },
  });

  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0], {
    code: "invalid_union",
    path: ["payload"],
    expected: "object | object",
    received: "object",
    message: "Expected input to match one union choice.",
    suggestion: "Pass a value that satisfies one of the union schemas.",
    branches: [
      {
        index: 0,
        issues: [
          {
            code: "invalid_literal",
            path: ["payload", "kind"],
            expected: "\"text\"",
            received: "string",
            message: "Expected literal \"text\".",
            suggestion: "Pass the exact literal value.",
          },
          {
            code: "invalid_type",
            path: ["payload", "value"],
            expected: "string",
            received: "boolean",
            message: "Expected a string.",
            suggestion: "Pass a string value.",
          },
        ],
      },
      {
        index: 1,
        issues: [
          {
            code: "invalid_literal",
            path: ["payload", "kind"],
            expected: "\"count\"",
            received: "string",
            message: "Expected literal \"count\".",
            suggestion: "Pass the exact literal value.",
          },
          {
            code: "invalid_type",
            path: ["payload", "value"],
            expected: "finite number",
            received: "boolean",
            message: "Expected a finite number.",
            suggestion: "Pass a number value without coercion.",
          },
        ],
      },
    ],
  });
});

test("union schemas preserve recursive immutable branch diagnostics", () => {
  const nestedSchema = union([
    union([literal("a"), literal("b")]),
    literal("c"),
  ]);
  const result = nestedSchema.safeParse("other");

  assert.equal(result.success, false);
  const rootIssue = result.error.issues[0]!;
  const nestedIssue = rootIssue.branches?.[0]?.issues[0];

  assert.equal(nestedIssue?.code, "invalid_union");
  assert.deepEqual(nestedIssue?.branches?.map((branch) => branch.index), [0, 1]);
  assert.equal(Object.isFrozen(rootIssue.branches), true);
  assert.equal(Object.isFrozen(rootIssue.branches?.[0]), true);
  assert.equal(Object.isFrozen(rootIssue.branches?.[0]?.issues), true);
  assert.equal(Object.isFrozen(nestedIssue?.branches), true);
});

test("discriminated unions route by required literal and enum tags", () => {
  const eventSchema = discriminatedUnion("type", [
    object({ type: literal("created"), id: string() }),
    object({ type: enumSchema(["updated", "renamed"] as const), id: string() }),
  ] as const);

  assert.deepEqual(eventSchema.parse({ type: "created", id: "evt_1" }), {
    type: "created",
    id: "evt_1",
  });
  assert.deepEqual(eventSchema.parse({ type: "renamed", id: "evt_2" }), {
    type: "renamed",
    id: "evt_2",
  });

  type Event = Infer<typeof eventSchema>;
  type EventExpectation = Expect<Equal<Event,
    | { type: "created"; id: string }
    | { type: "updated" | "renamed"; id: string }
  >>;
  const eventExpectation: EventExpectation = true;
  assert.equal(eventExpectation, true);

  assert.deepEqual(describeSchema(eventSchema), {
    kind: "discriminatedUnion",
    discriminator: "type",
    choices: [
      {
        kind: "object",
        shape: { type: { kind: "literal", value: "created" }, id: { kind: "string" } },
        required: ["type", "id"],
        unknownProperties: "reject",
      },
      {
        kind: "object",
        shape: {
          type: { kind: "enum", values: ["updated", "renamed"] },
          id: { kind: "string" },
        },
        required: ["type", "id"],
        unknownProperties: "reject",
      },
    ],
  });
});

test("discriminated unions report tag paths and preserve selected branch issues", () => {
  const eventSchema = object({
    payload: discriminatedUnion("type", [
      object({ type: literal("created"), id: string() }),
      object({ type: literal("deleted"), id: string() }),
    ] as const),
  });

  const unknownTag = eventSchema.safeParse({ payload: { type: "other", id: "evt_1" } });
  assert.equal(unknownTag.success, false);
  assert.deepEqual(unknownTag.error.issues[0], {
    code: "invalid_discriminator",
    path: ["payload", "type"],
    expected: '"created" | "deleted"',
    received: "string",
    message: 'Expected discriminator "type" to match one declared choice.',
    suggestion: 'Pass one of the declared discriminator values: "created" | "deleted".',
  });

  const selectedBranch = eventSchema.safeParse({ payload: { type: "created", id: 10 } });
  assert.equal(selectedBranch.success, false);
  assert.deepEqual(selectedBranch.error.issues.map((issue) => [issue.code, issue.path]), [
    ["invalid_type", ["payload", "id"]],
  ]);
});

test("discriminated union configuration is validated eagerly", () => {
  assert.throws(
    () => discriminatedUnion("type", [] as unknown as readonly [Schema<unknown>]),
    /non-empty array/,
  );
  assert.throws(
    () => discriminatedUnion("type", [string()] as const),
    /must be object schemas/,
  );
  assert.throws(
    () => discriminatedUnion("type", [object({ type: literal("x").optional() })] as const),
    /must be required/,
  );
  assert.throws(
    () => discriminatedUnion("type", [object({ type: literal(true) })] as const),
    /string or finite-number literal or enum/,
  );
  assert.throws(
    () => discriminatedUnion("type", [
      object({ type: literal("same") }),
      object({ type: enumSchema(["other", "same"] as const) }),
    ] as const),
    /must be unique/,
  );
});

test("intersections preserve diagnostics and merge compatible outputs", () => {
  const bounded = intersection(
    string({ minLength: 2 }),
    string({ maxLength: 4 }),
  );
  assert.equal(bounded.parse("name"), "name");

  const bothFailed = intersection(string(), number()).safeParse(false);
  assert.equal(bothFailed.success, false);
  assert.deepEqual(bothFailed.error.issues.map((issue) => issue.code), [
    "invalid_type",
    "invalid_type",
  ]);

  const userSchema = intersection(
    object({ id: string(), tags: array(string()) }),
    object({ id: string(), tags: array(string()) }),
  );
  const parsed = userSchema.parse({ id: "user_1", tags: ["core"] });
  assert.deepEqual(parsed, { id: "user_1", tags: ["core"] });
  assert.equal(Object.isFrozen(parsed), true);
  assert.equal(Object.isFrozen(parsed.tags), true);

  type BoundedInput = Expect<Equal<InferInput<typeof bounded>, string>>;
  type BoundedOutput = Expect<Equal<InferOutput<typeof bounded>, string>>;
  const boundedInput: BoundedInput = true;
  const boundedOutput: BoundedOutput = true;
  assert.equal(boundedInput && boundedOutput, true);
});

test("intersections reject incompatible successful outputs", () => {
  const normalized = intersection(
    string().transform((value) => value.toUpperCase(), { id: "uppercase" }),
    string().transform((value) => value.toLowerCase(), { id: "lowercase" }),
  );
  const result = normalized.safeParse("Mixed");

  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0], {
    code: "intersection_conflict",
    path: [],
    expected: "compatible intersection outputs",
    received: "string",
    message: "Intersection schemas produced incompatible outputs.",
    suggestion: "Use schemas whose successful outputs agree or can be merged recursively.",
  });
  assert.deepEqual(describeSchema(normalized), {
    kind: "intersection",
    left: { kind: "transform", inner: { kind: "string" }, id: "uppercase" },
    right: { kind: "transform", inner: { kind: "string" }, id: "lowercase" },
  });
});

test("optional object fields may be omitted", () => {
  const accountSchema = object({
    id: string(),
    nickname: string().optional(),
  });

  assert.deepEqual(accountSchema.parse({ id: "acct_1" }), { id: "acct_1" });
  assert.deepEqual(accountSchema.parse({ id: "acct_1", nickname: "dev" }), {
    id: "acct_1",
    nickname: "dev",
  });
});

test("nullable schemas accept null and otherwise validate inner schema", () => {
  const nullableNameSchema = nullable(string());

  assert.deepEqual(nullableNameSchema.safeParse(null), { success: true, data: null });
  assert.deepEqual(nullableNameSchema.safeParse("dev"), { success: true, data: "dev" });

  const result = nullableNameSchema.safeParse(123);
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.code, "invalid_type");
  assert.equal(result.error.issues[0]?.expected, "string");
});

test("record schemas validate string-keyed object values", () => {
  const flagsSchema = record(boolean());

  assert.deepEqual(flagsSchema.parse({ darkMode: true, beta: false }), {
    darkMode: true,
    beta: false,
  });

  const result = flagsSchema.safeParse({ darkMode: true, beta: "false" });
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0], {
    code: "invalid_type",
    path: ["beta"],
    expected: "boolean",
    received: "string",
    message: "Expected a boolean.",
    suggestion: "Pass true or false.",
  });
});

test("record schemas reject null and arrays", () => {
  const flagsSchema = record(boolean());

  const nullResult = flagsSchema.safeParse(null);
  assert.equal(nullResult.success, false);
  assert.equal(nullResult.error.issues[0]?.received, "null");

  const arrayResult = flagsSchema.safeParse([]);
  assert.equal(arrayResult.success, false);
  assert.equal(arrayResult.error.issues[0]?.received, "array");
});

test("record key constraints reuse native string validation", () => {
  const counters = record(number(), {
    key: { maxLength: 8, pattern: "^[a-z]+$" },
  });

  assert.deepEqual(counters.parse({ active: 1 }), { active: 1 });
  const result = counters.safeParse({ "Bad-Key": "value", toolongkey: 2 });
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues.map((issue) => [issue.code, issue.path]), [
    ["invalid_string_pattern", ["Bad-Key"]],
    ["invalid_type", ["Bad-Key"]],
    ["too_large", ["toolongkey"]],
  ]);

  const definition = describeSchema(counters);
  assert.deepEqual(definition, {
    kind: "record",
    key: { maxLength: 8, pattern: "^[a-z]+$" },
    value: { kind: "number" },
  });
  assert.equal(definition.kind === "record" && Object.isFrozen(definition.key), true);
  assert.throws(
    () => record(string(), { key: { pattern: "[" } }),
    /valid ECMAScript regular expression/,
  );
});

test("record output preserves prototype-like own keys safely", () => {
  const input = JSON.parse('{"__proto__": 1}') as Record<string, unknown>;
  const output = record(number()).parse(input);

  assert.equal(Object.prototype.hasOwnProperty.call(output, "__proto__"), true);
  assert.equal(output.__proto__, 1);
  assert.equal(Object.getPrototypeOf(output), Object.prototype);
});

test("refine returns a new schema and keeps the base schema behavior", () => {
  const baseSchema = string();
  const refinedSchema = baseSchema.refine((value) => value.length >= 3, {
    message: "Expected at least three characters.",
    expected: "string with length >= 3",
  });

  assert.notEqual(baseSchema, refinedSchema);
  assert.equal(baseSchema.safeParse("no").success, true);

  const result = refinedSchema.safeParse("no");
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.code, "custom");
  assert.equal(result.error.issues[0]?.expected, "string with length >= 3");
});

test("refine addresses one custom issue with a frozen relative path", () => {
  const path: (string | number)[] = ["confirmation"];
  const credentials = object({
    password: string(),
    confirmation: string(),
  }).refine(
    (value) => value.password === value.confirmation,
    {
      id: "password-confirmation/v1",
      path,
      message: "Passwords must match.",
      expected: "confirmation equal to password",
    },
  );

  path[0] = "password";
  const result = credentials.safeParse({ password: "secret", confirmation: "other" });

  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0], {
    code: "custom",
    path: ["confirmation"],
    expected: "confirmation equal to password",
    received: "string",
    message: "Passwords must match.",
  });
  assert.equal(Object.isFrozen(result.error.issues[0]?.path), true);
});

test("refineWithIssues emits ordered immutable issues at nested relative paths", () => {
  let collectorContextFrozen = false;
  const period = object({
    start: number(),
    end: number(),
  }).refineWithIssues((value, context) => {
    collectorContextFrozen = Object.isFrozen(context);
    if (value.start > value.end) {
      context.addIssue({
        path: ["start"],
        message: "Start must not exceed end.",
        expected: "number <= end",
      });
      const path: (string | number)[] = ["end"];
      context.addIssue({
        path,
        message: "End must not be smaller than start.",
        suggestion: "Swap the range boundaries.",
      });
      path[0] = "start";
    }
  }, { id: "ordered-period/v1" });
  const schemaWithNestedPeriod = object({ period });

  assert.equal(period.safeParse({ start: 1, end: 2 }).success, true);
  const result = schemaWithNestedPeriod.safeParse({ period: { start: 5, end: 2 } });

  assert.equal(result.success, false);
  assert.equal(collectorContextFrozen, true);
  assert.deepEqual(result.error.issues.map((issue) => issue.path), [
    ["period", "start"],
    ["period", "end"],
  ]);
  assert.deepEqual(result.error.issues.map((issue) => issue.received), ["number", "number"]);
  assert.equal(result.error.issues[1]?.suggestion, "Swap the range boundaries.");
  assert.equal(Object.isFrozen(result.error.issues), true);
  assert.equal(result.error.issues.every((issue) => Object.isFrozen(issue.path)), true);
});

test("refineWithIssues rejects missing ids and contains callback failures", () => {
  assert.throws(
    () => string().refineWithIssues(() => undefined, undefined as never),
    /stable id are required/,
  );
  assert.throws(
    () => string().refineWithIssues(() => undefined, { id: " " }),
    /must not be empty/,
  );

  const thrown = string().refineWithIssues(() => {
    throw new Error("secret callback detail");
  }, { id: "throwing-rule/v1" }).safeParse("value");
  assert.equal(thrown.success, false);
  assert.equal(thrown.error.issues[0]?.message, "Custom diagnostic refinement failed to execute.");
  assert.equal(thrown.error.issues[0]?.message.includes("secret"), false);

  const asynchronous = string().refineWithIssues(async () => {
    throw new Error("rejected async detail");
  }, {
    id: "async-rule/v1",
  }).safeParse("value");
  assert.equal(asynchronous.success, false);
  assert.equal(
    asynchronous.error.issues[0]?.message,
    "Async custom diagnostic refinements are not supported.",
  );
});

test("custom diagnostic refinements retain opaque ids and Standard Schema issues", () => {
  const checked = object({ value: number() }).refineWithIssues((value, context) => {
    if (value.value < 0) {
      context.addIssue({ path: ["value"], message: "Value must be non-negative." });
    }
  }, { id: "non-negative-value/v1" });

  assert.deepEqual(describeSchema(checked), {
    kind: "object",
    shape: { value: { kind: "number" } },
    required: ["value"],
    unknownProperties: "reject",
    refinements: ["non-negative-value/v1"],
  });
  assert.deepEqual(describeContract(checked).input.root, describeSchema(checked));

  const standard = checked["~standard"].validate({ value: -1 });
  assert.equal(standard instanceof Promise, false);
  assert.equal("issues" in standard && standard.issues !== undefined, true);
  if ("issues" in standard && standard.issues !== undefined) {
    assert.deepEqual(standard.issues.map((issue) => issue.path), [["value"]]);
  }
});

test("schema descriptions expose stable ids for opaque behavior", () => {
  const refined = string().refine((value) => value.length > 0, { id: "non-empty/v1" });
  const anonymousRefinement = string().refine((value) => value.length > 0);
  const transformed = string().transform((value) => value.length, { id: "string-length/v1" });

  assert.deepEqual(describeSchema(refined), {
    kind: "string",
    refinements: ["non-empty/v1"],
  });
  assert.deepEqual(describeSchema(anonymousRefinement), {
    kind: "string",
    refinements: [null],
  });
  assert.deepEqual(describeSchema(transformed), {
    kind: "transform",
    inner: { kind: "string" },
    id: "string-length/v1",
  });
  assert.deepEqual(
    describeSchema(
      string()
        .refine((value) => value.length > 0, { id: "non-empty/v1" })
        .annotate({ title: "Value" })
        .refine((value) => value.length < 10, { id: "short/v1" }),
    ),
    {
      kind: "string",
      metadata: { title: "Value" },
      refinements: ["non-empty/v1", "short/v1"],
    },
  );
  assert.throws(() => string().refine(() => true, { id: " " }), /must not be empty/);
  assert.throws(() => string().transform((value) => value, { id: "" }), /must not be empty/);
});

test("refine captures options immutably", () => {
  const options = {
    message: "Expected a non-empty string.",
    expected: "non-empty string",
  };
  const refinedSchema = string().refine((value) => value.length > 0, options);

  options.message = "Changed after schema creation.";

  const result = refinedSchema.safeParse("");
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.message, "Expected a non-empty string.");
});

test("transform maps successfully parsed values explicitly", () => {
  const lengthSchema = string().transform((value) => value.length);

  assert.deepEqual(lengthSchema.safeParse("hello"), { success: true, data: 5 });
  assert.equal(lengthSchema.safeParse(123).success, false);
});

test("input and output inference compose through transforms and containers", () => {
  const normalizedSchema = object({
    nameLength: string().transform((value) => value.length),
    scores: array(string().transform((value) => Number(value))),
    enabled: string()
      .transform((value) => value === "yes")
      .nullable(),
  });

  type Input = InferInput<typeof normalizedSchema>;
  type Output = InferOutput<typeof normalizedSchema>;
  type LegacyOutput = Infer<typeof normalizedSchema>;
  type InputExpectation = Expect<
    Equal<
      Input,
      {
        nameLength: string;
        scores: readonly string[];
        enabled: string | null;
      }
    >
  >;
  type OutputExpectation = Expect<
    Equal<
      Output,
      {
        nameLength: number;
        scores: readonly number[];
        enabled: boolean | null;
      }
    >
  >;
  type InferAliasExpectation = Expect<Equal<LegacyOutput, Output>>;

  const inputExpectation: InputExpectation = true;
  const outputExpectation: OutputExpectation = true;
  const inferAliasExpectation: InferAliasExpectation = true;

  assert.deepEqual(normalizedSchema.safeParse({
    nameLength: "Ada",
    scores: ["10", "20"],
    enabled: "yes",
  }), {
    success: true,
    data: {
      nameLength: 3,
      scores: [10, 20],
      enabled: true,
    },
  });
  assert.equal(inputExpectation, true);
  assert.equal(outputExpectation, true);
  assert.equal(inferAliasExpectation, true);
});

test("schemas implement synchronous immutable Standard Schema V1 validation", () => {
  const lengthSchema = string().transform((value) => value.length);
  const standardSchema: StandardSchemaV1<string, number> = lengthSchema;
  const protocol = standardSchema["~standard"];

  assert.equal(protocol.version, 1);
  assert.equal(protocol.vendor, "safe-shape");
  assert.equal(Object.isFrozen(protocol), true);
  assert.equal("types" in protocol, false);

  const result = protocol.validate("hello", {
    libraryOptions: { ignoredBySafeShape: true },
  });
  assert.equal(result instanceof Promise, false);
  if (result instanceof Promise) throw new Error("Expected synchronous validation.");

  assert.deepEqual(result, { value: 5 });
  assert.equal(Object.isFrozen(result), true);

  type StandardInput = StandardSchemaV1.InferInput<typeof lengthSchema>;
  type StandardOutput = StandardSchemaV1.InferOutput<typeof lengthSchema>;
  type InputExpectation = Expect<Equal<StandardInput, string>>;
  type OutputExpectation = Expect<Equal<StandardOutput, number>>;
  const inputExpectation: InputExpectation = true;
  const outputExpectation: OutputExpectation = true;

  assert.equal(inputExpectation, true);
  assert.equal(outputExpectation, true);
});

test("Standard Schema V1 failures retain native paths and union branches", () => {
  const roleSchema = object({
    role: union([literal("admin"), literal("member")]),
  });
  const result = roleSchema["~standard"].validate({ role: "owner" });

  assert.equal(result instanceof Promise, false);
  if (result instanceof Promise) throw new Error("Expected synchronous validation.");
  assert.notEqual(result.issues, undefined);
  if (result.issues === undefined) throw new Error("Expected validation failure.");

  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.issues), true);
  const issue = result.issues[0]! as Issue;
  assert.deepEqual(issue.path, ["role"]);
  assert.equal(issue.code, "invalid_union");
  assert.deepEqual(issue.branches?.map((branch) => branch.index), [0, 1]);
});

test("Schema output-first generic remains source compatible", () => {
  const legacyContract: Schema<string> = string();
  const transformedContract: Schema<number, string> = string().transform(
    (value) => value.length,
  );

  type Input = InferInput<typeof transformedContract>;
  type Output = InferOutput<typeof transformedContract>;
  type InputExpectation = Expect<Equal<Input, string>>;
  type OutputExpectation = Expect<Equal<Output, number>>;

  const inputExpectation: InputExpectation = true;
  const outputExpectation: OutputExpectation = true;

  assert.equal(legacyContract.parse("value"), "value");
  assert.equal(transformedContract.parse("value"), 5);
  assert.equal(inputExpectation, true);
  assert.equal(outputExpectation, true);
});

test("object omission follows explicit optional schemas on both type sides", () => {
  const presenceSchema = object({
    explicit: string().optional().annotate({ title: "Optional" }),
    requiredLiteral: literal(undefined),
    requiredTransform: string().transform(() => undefined),
  });

  type Input = InferInput<typeof presenceSchema>;
  type Output = InferOutput<typeof presenceSchema>;
  type InputExpectation = Expect<
    Equal<
      Input,
      {
        explicit?: string;
        requiredLiteral: undefined;
        requiredTransform: string;
      }
    >
  >;
  type OutputExpectation = Expect<
    Equal<
      Output,
      {
        explicit?: string;
        requiredLiteral: undefined;
        requiredTransform: undefined;
      }
    >
  >;

  const inputExpectation: InputExpectation = true;
  const outputExpectation: OutputExpectation = true;
  const missing = presenceSchema.safeParse({});

  assert.equal(missing.success, false);
  assert.deepEqual(
    missing.error.issues.map((issue) => issue.path),
    [["requiredLiteral"], ["requiredTransform"]],
  );
  assert.equal(inputExpectation, true);
  assert.equal(outputExpectation, true);
});

test("lazy schemas validate recursive values and cache their target", () => {
  interface TreeNode {
    readonly name: string;
    readonly children: readonly TreeNode[];
  }

  let resolutions = 0;
  let treeSchema: Schema<TreeNode>;
  treeSchema = lazy(
    () => {
      resolutions += 1;
      return object({
        name: string(),
        children: array(treeSchema),
      });
    },
    { id: "TreeNode" },
  );

  const value = {
    name: "root",
    children: [{ name: "leaf", children: [] }],
  };

  assert.deepEqual(treeSchema.parse(value), value);
  assert.deepEqual(treeSchema.parse(value), value);
  assert.equal(resolutions, 1);
  assert.equal(Object.isFrozen(treeSchema), true);
});

test("describeContract emits deterministic input and output graphs", () => {
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

  const description = describeContract(treeSchema);
  const expectedGraph = {
    root: { kind: "reference", id: "TreeNode" },
    definitions: {
      TreeNode: {
        kind: "object",
        shape: {
          children: {
            kind: "array",
            item: { kind: "reference", id: "TreeNode" },
          },
          name: { kind: "string" },
        },
        required: ["children", "name"],
        unknownProperties: "reject",
      },
    },
  };

  assert.deepEqual(description, {
    format: SCHEMA_CONTRACT_FORMAT,
    input: expectedGraph,
    output: expectedGraph,
  });
  assert.equal(Object.isFrozen(description), true);
  assert.equal(Object.isFrozen(description.input), true);
  assert.equal(Object.isFrozen(description.input.definitions), true);
  assert.equal(Object.isFrozen(description.input.definitions.TreeNode), true);
  assert.deepEqual(describeSchema(treeSchema), {
    kind: "reference",
    id: "TreeNode",
  });
});

test("describeContract makes erased transform outputs explicit", () => {
  const transformed = object({
    length: string().transform((value) => value.length, {
      id: "string-length/v1",
    }),
  });
  const description = describeContract(transformed);

  assert.deepEqual(description.input.root, {
    kind: "object",
    shape: {
      length: {
        kind: "transform",
        inner: { kind: "string" },
        id: "string-length/v1",
      },
    },
    required: ["length"],
    unknownProperties: "reject",
  });
  assert.deepEqual(description.output.root, {
    kind: "object",
    shape: {
      length: {
        kind: "opaque",
        behavior: "transform",
        id: "string-length/v1",
      },
    },
    required: ["length"],
    unknownProperties: "reject",
  });
});

test("lazy schema ids and getters fail explicitly when invalid", () => {
  assert.throws(
    () => lazy(() => string(), { id: " TreeNode" }),
    /must not contain surrounding whitespace/,
  );

  const first = lazy(() => string(), { id: "Duplicate" });
  const second = lazy(() => number(), { id: "Duplicate" });
  assert.throws(
    () => describeContract(object({ first, second })),
    /Duplicate lazy schema id: Duplicate/,
  );

  let direct: Schema<string>;
  direct = lazy(() => direct, { id: "Direct" });
  assert.throws(
    () => direct.safeParse("value"),
    /must resolve through a concrete schema/,
  );

  let firstAlias: Schema<string>;
  let secondAlias: Schema<string>;
  firstAlias = lazy(() => secondAlias, { id: "FirstAlias" });
  secondAlias = lazy(() => firstAlias, { id: "SecondAlias" });
  assert.throws(
    () => firstAlias.safeParse("value"),
    /must resolve through a concrete schema/,
  );

  const invalid = lazy(
    () => ({}) as Schema<string>,
    { id: "InvalidTarget" },
  );
  assert.throws(
    () => invalid.safeParse("value"),
    /getter must return a SafeShape schema/,
  );
});

test("transform failure returns a stable issue", () => {
  const integerSchema = string().transform(
    (value) => {
      const parsed = Number.parseInt(value, 10);

      if (!Number.isSafeInteger(parsed)) {
        throw new Error("invalid integer");
      }

      return parsed;
    },
    {
      message: "Expected a string containing an integer.",
      expected: "integer string",
      suggestion: "Pass digits such as \"42\".",
    },
  );

  const result = integerSchema.safeParse("abc");

  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0], {
    code: "transform_failed",
    path: [],
    expected: "integer string",
    received: "string",
    message: "Expected a string containing an integer.",
    suggestion: "Pass digits such as \"42\".",
  });
});

test("transform composes with refine and optional", () => {
  const uppercaseSchema = string()
    .transform((value) => value.toUpperCase())
    .refine((value) => value.length >= 2);
  const optionalLengthSchema = string().optional().transform((value) => value?.length ?? 0);

  assert.deepEqual(uppercaseSchema.safeParse("ok"), { success: true, data: "OK" });
  assert.equal(uppercaseSchema.safeParse("x").success, false);
  assert.deepEqual(optionalLengthSchema.safeParse(undefined), { success: true, data: 0 });
});

test("schema operations return frozen schema instances", () => {
  const baseSchema = string();
  const refinedSchema = baseSchema.refine((value) => value.length > 0);
  const optionalSchema = baseSchema.optional();
  const annotatedSchema = baseSchema.annotate({ title: "Name" });
  const unionSchema = union([string(), number()]);
  const transformSchema = baseSchema.transform((value) => value.length);
  const nullableSchema = baseSchema.nullable();
  const recordSchema = record(baseSchema);
  const tupleSchema = tuple([baseSchema, number()]);

  assert.equal(Object.isFrozen(baseSchema), true);
  assert.equal(Object.isFrozen(refinedSchema), true);
  assert.equal(Object.isFrozen(optionalSchema), true);
  assert.equal(Object.isFrozen(annotatedSchema), true);
  assert.equal(Object.isFrozen(unionSchema), true);
  assert.equal(Object.isFrozen(transformSchema), true);
  assert.equal(Object.isFrozen(nullableSchema), true);
  assert.equal(Object.isFrozen(recordSchema), true);
  assert.equal(Object.isFrozen(tupleSchema), true);
  assert.notEqual(baseSchema, refinedSchema);
  assert.notEqual(baseSchema, optionalSchema);
  assert.notEqual(baseSchema, annotatedSchema);
});

test("parse results and issues are frozen", () => {
  const successResult = string().safeParse("value");
  assert.equal(Object.isFrozen(successResult), true);

  const failureResult = string().safeParse(123);
  assert.equal(failureResult.success, false);
  assert.equal(Object.isFrozen(failureResult), true);
  assert.equal(Object.isFrozen(failureResult.error.issues), true);
  assert.equal(Object.isFrozen(failureResult.error.issues[0]), true);
  assert.equal(Object.isFrozen(failureResult.error.issues[0]?.path), true);
});

test("parse throws ValidationError on failure", () => {
  assert.throws(
    () => string().parse(null),
    (error) => {
      assert.equal(error instanceof ValidationError, true);
      assert.equal((error as ValidationError).issues[0]?.path.length, 0);
      return true;
    },
  );
});

test("diagnostics format stable input paths", () => {
  assert.equal(formatIssuePath([]), "input");
  assert.equal(formatIssuePath(["owner", "contacts", 1, "email"]), "input.owner.contacts[1].email");
  assert.equal(formatIssuePath(["invalid-key", 0]), "input[\"invalid-key\"][0]");
});

test("diagnostics render issues and validation errors", () => {
  const result = object({
    owner: object({
      email: string(),
    }),
  }).safeParse({
    owner: {
      email: 123,
    },
  });

  assert.equal(result.success, false);

  const diagnostic = createDiagnostic(result.error.issues[0]!);
  assert.deepEqual(diagnostic, {
    code: "invalid_type",
    path: "input.owner.email",
    message: "Expected a string.",
    expected: "string",
    received: "number",
    suggestion: "Pass a string value.",
  });
  assert.equal(Object.isFrozen(diagnostic), true);

  const diagnostics = createDiagnostics(result.error.issues);
  assert.equal(Object.isFrozen(diagnostics), true);

  const formattedIssues = formatIssues(result.error.issues);
  assert.equal(Object.isFrozen(formattedIssues), true);
  assert.deepEqual(formattedIssues, [
    "input.owner.email: Expected a string. Expected string; received number. Suggestion: Pass a string value. (invalid_type)",
  ]);
  assert.equal(formatValidationError(result.error), formattedIssues[0]);
});

test("diagnostics preserve and format recursive union branches", () => {
  const result = union([
    object({ kind: literal("text"), value: string() }),
    object({ kind: literal("count"), value: number() }),
  ]).safeParse({ kind: "other", value: true });

  assert.equal(result.success, false);
  const diagnostic = createDiagnostic(result.error.issues[0]!);

  assert.deepEqual(diagnostic.branches?.map((branch) => branch.index), [0, 1]);
  assert.equal(diagnostic.branches?.[0]?.issues[0]?.path, "input.kind");
  assert.equal(Object.isFrozen(diagnostic.branches), true);
  assert.equal(Object.isFrozen(diagnostic.branches?.[0]), true);
  assert.equal(Object.isFrozen(diagnostic.branches?.[0]?.issues), true);
  assert.equal(formatDiagnostic(diagnostic), [
    "input: Expected input to match one union choice. Expected object | object; received object. Suggestion: Pass a value that satisfies one of the union schemas. (invalid_union)",
    "  Union branch 0:",
    "    input.kind: Expected literal \"text\". Expected \"text\"; received string. Suggestion: Pass the exact literal value. (invalid_literal)",
    "    input.value: Expected a string. Expected string; received boolean. Suggestion: Pass a string value. (invalid_type)",
    "  Union branch 1:",
    "    input.kind: Expected literal \"count\". Expected \"count\"; received string. Suggestion: Pass the exact literal value. (invalid_literal)",
    "    input.value: Expected a finite number. Expected finite number; received boolean. Suggestion: Pass a number value without coercion. (invalid_type)",
  ].join("\n"));
});

test("describeSchema returns frozen schema definitions", () => {
  const definition = describeSchema(
    object({
      id: string(),
      age: number().optional(),
      tags: array(string()),
      point: tuple([number(), number()]),
      status: union([literal("draft"), literal("published")]),
      metadata: record(nullable(string())),
      nameLength: string().transform((value) => value.length),
    }),
  );

  assert.equal(Object.isFrozen(definition), true);
  assert.deepEqual(definition, {
    kind: "object",
    required: ["id", "tags", "point", "status", "metadata", "nameLength"],
    unknownProperties: "reject",
    shape: {
      id: { kind: "string" },
      age: { kind: "optional", inner: { kind: "number" } },
      tags: { kind: "array", item: { kind: "string" } },
      point: { kind: "tuple", items: [{ kind: "number" }, { kind: "number" }] },
      status: {
        kind: "union",
        choices: [
          { kind: "literal", value: "draft" },
          { kind: "literal", value: "published" },
        ],
      },
      metadata: {
        kind: "record",
        value: { kind: "nullable", inner: { kind: "string" } },
      },
      nameLength: { kind: "transform", inner: { kind: "string" } },
    },
  });
});

test("annotate adds immutable schema metadata without changing parsing", () => {
  const metadata = {
    title: "User id",
    description: "Stable public user identifier.",
    examples: ["user_1"],
  };
  const userIdSchema = annotate(string(), metadata);

  metadata.examples.push("changed");

  assert.deepEqual(userIdSchema.safeParse("user_1"), { success: true, data: "user_1" });
  assert.equal(userIdSchema.safeParse(42).success, false);

  const definition = describeSchema(userIdSchema);

  assert.deepEqual(definition, {
    kind: "string",
    metadata: {
      title: "User id",
      description: "Stable public user identifier.",
      examples: ["user_1"],
    },
  });
  assert.equal(Object.isFrozen(definition), true);
  assert.equal(Object.isFrozen(definition.metadata), true);
  assert.equal(Object.isFrozen(definition.metadata?.examples), true);
});

test("annotations compose and preserve output type inference", () => {
  const nameSchema = string()
    .annotate({ title: "Name", examples: ["Ada"] })
    .annotate({ description: "Display name." });
  const definition = describeSchema(nameSchema);

  assert.deepEqual(definition, {
    kind: "string",
    metadata: {
      title: "Name",
      description: "Display name.",
      examples: ["Ada"],
    },
  });

  type Name = Infer<typeof nameSchema>;
  type NameExpectation = Expect<Equal<Name, string>>;
  const _nameExpectation: NameExpectation = true;
  assert.equal(_nameExpectation, true);
});

test("schema namespace exposes the builder API", () => {
  const result = schema
    .object({
      active: schema.boolean(),
      name: schema.nullable(schema.string()),
      flags: schema.record(schema.boolean()),
      point: schema.tuple([schema.number(), schema.number()]),
      count: schema.integer({ minimum: 0 }),
      status: schema.enum(["draft", "published"]),
      payload: schema.unknown(),
      referenced: schema.lazy(() => schema.string(), { id: "ReferencedString" }),
      event: schema.discriminatedUnion("type", [
        schema.object({ type: schema.literal("created") }),
        schema.object({ type: schema.literal("deleted") }),
      ]),
      bounded: schema.intersection(
        schema.string({ minLength: 1 }),
        schema.string({ maxLength: 10 }),
      ),
      tagged: schema.annotate(schema.string(), { title: "Tagged" }),
    })
    .safeParse({
      active: true,
      name: null,
      flags: { beta: false },
      point: [10, 20],
      count: 2,
      status: "draft",
      payload: { source: "test" },
      referenced: "value",
      event: { type: "created" },
      bounded: "ok",
      tagged: "ok",
    });

  assert.deepEqual(result, {
    success: true,
    data: {
      active: true,
      name: null,
      flags: { beta: false },
      point: [10, 20],
      count: 2,
      status: "draft",
      payload: { source: "test" },
      referenced: "value",
      event: { type: "created" },
      bounded: "ok",
      tagged: "ok",
    },
  });

  assert.equal(schema.never().safeParse("value").success, false);
});

const userSchema = object({
  id: string(),
  age: number().optional(),
  roles: array(union([literal("admin"), literal("member")])),
  displayNameLength: string().transform((value) => value.length),
  metadata: record(nullable(string())),
  point: tuple([number(), number()]),
});

type User = Infer<typeof userSchema>;
type UserExpectation = Expect<
  Equal<
    User,
    {
      id: string;
      age?: number;
      roles: readonly ("admin" | "member")[];
      displayNameLength: number;
      metadata: Readonly<Record<string, string | null>>;
      point: readonly [number, number];
    }
  >
>;

const validUser: User = {
  id: "user_1",
  roles: ["admin", "member"],
  displayNameLength: 5,
  metadata: {
    team: "core",
    region: null,
  },
  point: [10, 20],
};

const schemaContract: Schema<string> = string();

assert.equal(validUser.id, "user_1");
assert.equal(schemaContract.safeParse("value").success, true);
