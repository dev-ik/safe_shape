import assert from "node:assert/strict";
import test from "node:test";
import {
  ValidationError,
  array,
  annotate,
  boolean,
  createDiagnostic,
  createDiagnostics,
  describeSchema,
  formatIssuePath,
  formatIssues,
  formatValidationError,
  literal,
  nullable,
  number,
  object,
  record,
  schema,
  string,
  tuple,
  union,
  type Infer,
  type Schema,
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

test("literal schemas require exact values", () => {
  const statusSchema = literal("ok");

  assert.equal(statusSchema.parse("ok"), "ok");

  const result = statusSchema.safeParse("error");
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0]?.code, "invalid_literal");
  assert.equal(result.error.issues[0]?.expected, "\"ok\"");
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
      tagged: schema.annotate(schema.string(), { title: "Tagged" }),
    })
    .safeParse({ active: true, name: null, flags: { beta: false }, point: [10, 20], tagged: "ok" });

  assert.deepEqual(result, {
    success: true,
    data: { active: true, name: null, flags: { beta: false }, point: [10, 20], tagged: "ok" },
  });
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
