import assert from "node:assert/strict";
import test from "node:test";
import {
  array,
  boolean,
  discriminatedUnion,
  enum as enumSchema,
  literal,
  integer,
  intersection,
  lazy,
  nullable,
  never as neverSchema,
  number,
  object,
  record,
  string,
  tuple,
  union,
  unknown as unknownSchema,
  type Schema,
  type StandardSchemaV1,
} from "@safe-shape/core";
import {
  createStandardJsonSchema,
  safeToJsonSchema,
  toJsonSchema,
  JsonSchemaExportError,
  type StandardJSONSchemaV1,
} from "../src/index.js";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;

type Expect<Value extends true> = Value;

test("exports primitive schemas", () => {
  assert.deepEqual(toJsonSchema(string()), { type: "string" });
  assert.deepEqual(toJsonSchema(number()), { type: "number" });
  assert.deepEqual(toJsonSchema(boolean()), { type: "boolean" });
  assert.deepEqual(toJsonSchema(literal("ok")), { const: "ok" });
  assert.deepEqual(toJsonSchema(enumSchema(["draft", "published", 1])), {
    enum: ["draft", "published", 1],
  });
  assert.deepEqual(toJsonSchema(unknownSchema()), {});
  assert.deepEqual(toJsonSchema(neverSchema()), { not: {} });
});

test("exports native constraints without approximation", () => {
  assert.deepEqual(toJsonSchema(string({ minLength: 1, maxLength: 100 })), {
    type: "string",
    minLength: 1,
    maxLength: 100,
  });
  assert.deepEqual(toJsonSchema(number({ minimum: 0, maximum: 10, multipleOf: 0.01 })), {
    type: "number",
    minimum: 0,
    maximum: 10,
    multipleOf: 0.01,
  });
  assert.deepEqual(toJsonSchema(integer({ minimum: 0, maximum: 10 })), {
    type: "integer",
    minimum: 0,
    maximum: 10,
  });
  assert.deepEqual(toJsonSchema(array(string(), { minLength: 1, maxLength: 5 })), {
    type: "array",
    items: { type: "string" },
    minItems: 1,
    maxItems: 5,
  });
});

test("exports exact string patterns and formats", () => {
  assert.deepEqual(toJsonSchema(string({ pattern: "^[a-z]+$" })), {
    type: "string",
    pattern: "^[a-z]+$",
  });
  assert.deepEqual(toJsonSchema(string({ format: "email" })), {
    type: "string",
    format: "email",
    pattern: "^(?=.{3,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$",
  });
  assert.deepEqual(toJsonSchema(string({
    minLength: 10,
    pattern: "@example\\.com$",
    format: "email",
  })), {
    type: "string",
    minLength: 10,
    format: "email",
    pattern: "^(?=.{3,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$",
    allOf: [{ pattern: "@example\\.com$" }],
  });
  assert.deepEqual(toJsonSchema(string({ format: "uuid" })), {
    type: "string",
    format: "uuid",
    pattern: "^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$",
  });
  assert.deepEqual(toJsonSchema(string({ format: "date" })), {
    type: "string",
    format: "date",
    pattern: "^(\\d{4})-(\\d{2})-(\\d{2})$",
  });
  assert.deepEqual(toJsonSchema(string({ format: "date-time" })), {
    type: "string",
    format: "date-time",
    pattern: "^(\\d{4})-(\\d{2})-(\\d{2})[Tt](\\d{2}):(\\d{2}):(\\d{2})(?:\\.\\d+)?(?:[Zz]|[+-]\\d{2}:\\d{2})$",
  });
});

test("exports arrays tuples unions records and nullable schemas", () => {
  assert.deepEqual(toJsonSchema(array(string())), {
    type: "array",
    items: { type: "string" },
  });
  assert.deepEqual(toJsonSchema(tuple([string(), number()])), {
    type: "array",
    prefixItems: [{ type: "string" }, { type: "number" }],
    minItems: 2,
    maxItems: 2,
  });
  assert.deepEqual(toJsonSchema(union([string(), number()])), {
    anyOf: [{ type: "string" }, { type: "number" }],
  });
  assert.deepEqual(toJsonSchema(record(nullable(string()))), {
    type: "object",
    additionalProperties: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
  });
  assert.deepEqual(toJsonSchema(record(number(), {
    key: { minLength: 2, maxLength: 20, pattern: "^[a-z]+$" },
  })), {
    type: "object",
    additionalProperties: { type: "number" },
    propertyNames: {
      type: "string",
      minLength: 2,
      maxLength: 20,
      pattern: "^[a-z]+$",
    },
  });
});

test("exports discriminated unions and intersections without approximation", () => {
  const eventSchema = discriminatedUnion("type", [
    object({ type: literal("created"), id: string() }),
    object({ type: literal("deleted"), id: string() }),
  ] as const);

  assert.deepEqual(toJsonSchema(eventSchema), {
    oneOf: [
      {
        type: "object",
        properties: { id: { type: "string" }, type: { const: "created" } },
        required: ["id", "type"],
        additionalProperties: false,
      },
      {
        type: "object",
        properties: { id: { type: "string" }, type: { const: "deleted" } },
        required: ["id", "type"],
        additionalProperties: false,
      },
    ],
  });
  assert.deepEqual(toJsonSchema(intersection(
    string({ minLength: 2 }),
    string({ maxLength: 100 }),
  )), {
    allOf: [
      { type: "string", minLength: 2 },
      { type: "string", maxLength: 100 },
    ],
  });
});

test("exports strict object schemas with required properties", () => {
  const userSchema = object({
    id: string(),
    age: number().optional(),
    role: union([literal("admin"), literal("member")]),
  });

  assert.deepEqual(toJsonSchema(userSchema), {
    type: "object",
    properties: {
      id: { type: "string" },
      age: { type: "number" },
      role: {
        anyOf: [{ const: "admin" }, { const: "member" }],
      },
    },
    required: ["id", "role"],
    additionalProperties: false,
  });
});

test("exports object unknown-property policies by contract side", () => {
  const stripped = object({ id: string() }, { unknownProperties: "strip" });
  const open = object({ id: string() }, { unknownProperties: "passthrough" });

  assert.deepEqual(toJsonSchema(stripped), {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
    additionalProperties: true,
  });
  assert.deepEqual(toJsonSchema(stripped, { side: "output" }), {
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
    additionalProperties: false,
  });
  assert.equal(toJsonSchema(open).additionalProperties, true);
  assert.equal(toJsonSchema(open, { side: "output" }).additionalProperties, true);
});

test("Standard JSON Schema V1 converts input and output independently", () => {
  const schema = object(
    { id: string() },
    { unknownProperties: "strip" },
  );
  const standard = createStandardJsonSchema(schema);
  const validationContract: StandardSchemaV1 = standard;
  const jsonSchemaContract: StandardJSONSchemaV1 = standard;

  assert.equal(validationContract["~standard"].vendor, "safe-shape");
  assert.equal(jsonSchemaContract["~standard"].version, 1);
  assert.equal(Object.isFrozen(standard), true);
  assert.equal(Object.isFrozen(standard["~standard"]), true);
  assert.equal(Object.isFrozen(standard["~standard"].jsonSchema), true);

  assert.deepEqual(standard["~standard"].jsonSchema.input({
    target: "draft-2020-12",
  }), {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
    additionalProperties: true,
  });
  assert.deepEqual(standard["~standard"].jsonSchema.output({
    target: "draft-2020-12",
  }), {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
    additionalProperties: false,
  });
  assert.deepEqual(standard["~standard"].jsonSchema.input({
    target: "draft-07",
  }), {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
    additionalProperties: true,
  });
  assert.deepEqual(standard["~standard"].jsonSchema.output({
    target: "draft-07",
  }), {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: { id: { type: "string" } },
    required: ["id"],
    additionalProperties: false,
  });

  const validation = standard["~standard"].validate({ id: "user_1", extra: true });
  assert.equal(validation instanceof Promise, false);
  if (!(validation instanceof Promise)) {
    assert.deepEqual(validation, { value: { id: "user_1" } });
  }
});

test("Standard JSON Schema V1 preserves type inference and explicit failures", () => {
  const transformed = createStandardJsonSchema(
    string().transform((value) => value.length),
  );

  type Input = StandardJSONSchemaV1.InferInput<typeof transformed>;
  type Output = StandardJSONSchemaV1.InferOutput<typeof transformed>;
  type InputExpectation = Expect<Equal<Input, string>>;
  type OutputExpectation = Expect<Equal<Output, number>>;
  const inputExpectation: InputExpectation = true;
  const outputExpectation: OutputExpectation = true;

  assert.equal(inputExpectation, true);
  assert.equal(outputExpectation, true);
  assert.deepEqual(transformed["~standard"].jsonSchema.input({
    target: "draft-2020-12",
  }), {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "string",
  });
  assert.throws(
    () => transformed["~standard"].jsonSchema.output({ target: "draft-2020-12" }),
    (error) => {
      assert.equal(error instanceof JsonSchemaExportError, true);
      assert.equal(
        (error as JsonSchemaExportError).issues[0]?.code,
        "json_schema.output.opaque",
      );
      return true;
    },
  );
  assert.throws(
    () => transformed["~standard"].jsonSchema.input({ target: "openapi-3.0" }),
    /Unsupported Standard JSON Schema target "openapi-3.0"/,
  );
  assert.throws(
    () => transformed["~standard"].jsonSchema.input({ target: "custom-draft" }),
    /Unsupported Standard JSON Schema target "custom-draft"/,
  );
});

test("exports schema metadata as JSON Schema annotations", () => {
  const userSchema = object({
    id: string().annotate({
      title: "User id",
      description: "Stable public user identifier.",
      examples: ["user_1"],
    }),
    nickname: string().optional().annotate({
      description: "Optional display nickname.",
    }),
  }).annotate({
    title: "User",
    description: "User resource.",
  });

  assert.deepEqual(toJsonSchema(userSchema), {
    type: "object",
    title: "User",
    description: "User resource.",
    properties: {
      id: {
        type: "string",
        title: "User id",
        description: "Stable public user identifier.",
        examples: ["user_1"],
      },
      nickname: {
        type: "string",
        description: "Optional display nickname.",
      },
    },
    required: ["id"],
    additionalProperties: false,
  });
});

test("exports transform schemas as their input schema", () => {
  assert.deepEqual(toJsonSchema(string().transform((value) => value.length)), {
    type: "string",
  });
});

test("exports recursive schemas through deterministic definitions and references", () => {
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
    { id: "Tree/Node" },
  );

  assert.deepEqual(toJsonSchema(treeSchema), {
    $ref: "#/$defs/Tree~1Node",
    $defs: {
      "Tree/Node": {
        type: "object",
        properties: {
          children: {
            type: "array",
            items: { $ref: "#/$defs/Tree~1Node" },
          },
          name: { type: "string" },
        },
        required: ["children", "name"],
        additionalProperties: false,
      },
    },
  });

  assert.deepEqual(
    createStandardJsonSchema(treeSchema)["~standard"].jsonSchema.input({
      target: "draft-2020-12",
    }),
    {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $ref: "#/$defs/Tree~1Node",
      $defs: {
        "Tree/Node": {
          type: "object",
          properties: {
            children: {
              type: "array",
              items: { $ref: "#/$defs/Tree~1Node" },
            },
            name: { type: "string" },
          },
          required: ["children", "name"],
          additionalProperties: false,
        },
      },
    },
  );

  const draft7 = {
    $schema: "http://json-schema.org/draft-07/schema#",
    $ref: "#/definitions/Tree~1Node",
    definitions: {
      "Tree/Node": {
        type: "object",
        properties: {
          children: {
            type: "array",
            items: { $ref: "#/definitions/Tree~1Node" },
          },
          name: { type: "string" },
        },
        required: ["children", "name"],
        additionalProperties: false,
      },
    },
  };
  assert.deepEqual(toJsonSchema(treeSchema, { target: "draft-07" }), draft7);
  assert.deepEqual(
    toJsonSchema(treeSchema, { schema: "http://json-schema.org/draft-07/schema#" }),
    draft7,
  );
  assert.deepEqual(
    createStandardJsonSchema(treeSchema)["~standard"].jsonSchema.input({
      target: "draft-07",
    }),
    draft7,
  );
});

test("renders tuple keywords for the selected JSON Schema dialect", () => {
  const pair = tuple([string(), number()]);

  assert.deepEqual(toJsonSchema(pair, { target: "draft-2020-12" }), {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "array",
    prefixItems: [{ type: "string" }, { type: "number" }],
    minItems: 2,
    maxItems: 2,
  });
  assert.deepEqual(toJsonSchema(pair, { target: "draft-07" }), {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "array",
    items: [{ type: "string" }, { type: "number" }],
    additionalItems: false,
    minItems: 2,
    maxItems: 2,
  });
});

test("emits one reusable definition for repeated lazy schema references", () => {
  const address = lazy(
    () => object({ city: string() }),
    { id: "Address" },
  );
  const customer = object({
    billing: address,
    shipping: address,
  });

  assert.deepEqual(toJsonSchema(customer, {
    id: "https://example.com/contracts/customer",
    target: "draft-2020-12",
  }), {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://example.com/contracts/customer",
    type: "object",
    properties: {
      billing: { $ref: "#/$defs/Address" },
      shipping: { $ref: "#/$defs/Address" },
    },
    required: ["billing", "shipping"],
    additionalProperties: false,
    $defs: {
      Address: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
        additionalProperties: false,
      },
    },
  });

  assert.deepEqual(toJsonSchema(customer, {
    id: "https://example.com/contracts/customer",
    target: "draft-07",
  }), {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://example.com/contracts/customer",
    type: "object",
    properties: {
      billing: { $ref: "#/definitions/Address" },
      shipping: { $ref: "#/definitions/Address" },
    },
    required: ["billing", "shipping"],
    additionalProperties: false,
    definitions: {
      Address: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
        additionalProperties: false,
      },
    },
  });

  assert.equal(address.parse({ city: "Yekaterinburg" }).city, "Yekaterinburg");

  const first = lazy(() => string(), { id: "Collision" });
  const second = lazy(() => number(), { id: "Collision" });
  assert.throws(
    () => toJsonSchema(object({ first, second })),
    /Duplicate lazy schema id: Collision/,
  );
});

test("validates root JSON Schema identifiers for direct and Standard export", () => {
  assert.deepEqual(toJsonSchema(string(), {
    id: "urn:safe-shape:contract:user",
  }), {
    $id: "urn:safe-shape:contract:user",
    type: "string",
  });

  const standard = createStandardJsonSchema(string());
  assert.deepEqual(standard["~standard"].jsonSchema.input({
    target: "draft-07",
    libraryOptions: { id: "https://example.com/contracts/name" },
  }), {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://example.com/contracts/name",
    type: "string",
  });

  for (const id of ["", "relative/schema", "https://example.com/schema#part", "https://example.com/has space"]) {
    assert.throws(() => toJsonSchema(string(), { id }), /JSON Schema \$id/);
  }
  assert.throws(
    () => standard["~standard"].jsonSchema.input({
      target: "draft-2020-12",
      libraryOptions: { id: 42 },
    }),
    /libraryOptions\.id must be a string/,
  );
});

test("returns immutable machine-readable JSON Schema export diagnostics", () => {
  const contract = object({
    age: number().refine((value) => value >= 18, {
      id: "adult/v1",
      message: "Expected an adult age.",
    }),
    name: string().refine((value) => value.length > 0),
    size: string().transform((value) => value.length, { id: "string-length/v1" }),
  });

  const inputResult = safeToJsonSchema(contract, { target: "draft-2020-12" });
  assert.equal(inputResult.success, false);
  if (!inputResult.success) {
    assert.deepEqual(inputResult.issues.map((issue) => ({
      code: issue.code,
      path: issue.path,
      side: issue.side,
      target: issue.target,
    })), [
      {
        code: "json_schema.refinement.unrepresentable",
        path: ["properties", "age"],
        side: "input",
        target: "draft-2020-12",
      },
      {
        code: "json_schema.refinement.unrepresentable",
        path: ["properties", "name"],
        side: "input",
        target: "draft-2020-12",
      },
    ]);
    assert.equal(inputResult.issues[0]?.details?.refinement_id, "adult/v1");
    assert.equal(inputResult.issues[1]?.details?.refinement_id, null);
    assert.equal(Object.isFrozen(inputResult), true);
    assert.equal(Object.isFrozen(inputResult.issues), true);
    assert.equal(Object.isFrozen(inputResult.issues[0]), true);
    assert.equal(Object.isFrozen(inputResult.issues[0]?.path), true);
    assert.equal(Object.isFrozen(inputResult.issues[0]?.details), true);
  }

  const outputResult = safeToJsonSchema(contract, {
    side: "output",
    target: "draft-07",
  });
  assert.equal(outputResult.success, false);
  if (!outputResult.success) {
    assert.deepEqual(outputResult.issues.map((issue) => issue.code), [
      "json_schema.refinement.unrepresentable",
      "json_schema.refinement.unrepresentable",
      "json_schema.output.opaque",
    ]);
    assert.deepEqual(outputResult.issues[2]?.path, ["properties", "size"]);
    assert.equal(outputResult.issues[2]?.side, "output");
    assert.equal(outputResult.issues[2]?.target, "draft-07");
    assert.equal(outputResult.issues[2]?.details?.id, "string-length/v1");
  }

  assert.throws(
    () => toJsonSchema(contract),
    (error) => {
      assert.equal(error instanceof JsonSchemaExportError, true);
      assert.equal((error as JsonSchemaExportError).issues.length, 2);
      return true;
    },
  );
});

test("rejects addressable custom diagnostic refinements without partial output", () => {
  const contract = object({ start: number(), end: number() }).refineWithIssues(
    (value, context) => {
      if (value.start > value.end) {
        context.addIssue({ path: ["end"], message: "End must not precede start." });
      }
    },
    { id: "ordered-period/v1" },
  );
  const result = safeToJsonSchema(contract);

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0]?.code, "json_schema.refinement.unrepresentable");
    assert.equal(result.issues[0]?.details?.refinement_id, "ordered-period/v1");
    assert.equal("schema" in result, false);
  }
});

test("reports reusable definition diagnostics once at the dialect-specific path", () => {
  const reusable = lazy(
    () => string().refine((value) => value.length > 0, { id: "non-empty/v1" }),
    { id: "ReusableName" },
  );
  const result = safeToJsonSchema(object({ first: reusable, second: reusable }), {
    target: "draft-07",
  });

  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.issues.length, 1);
    assert.deepEqual(result.issues[0]?.path, ["definitions", "ReusableName"]);
    assert.equal(result.issues[0]?.code, "json_schema.refinement.unrepresentable");
  }
});

test("returns a frozen success result for a representable schema", () => {
  const result = safeToJsonSchema(object({ id: string() }));

  assert.equal(result.success, true);
  if (result.success) {
    assert.deepEqual(result.schema, {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
      additionalProperties: false,
    });
    assert.deepEqual(result.warnings, []);
    assert.equal(Object.isFrozen(result), true);
    assert.equal(Object.isFrozen(result.warnings), true);
  }
});

test("rejects conflicting explicit JSON Schema dialect declarations", () => {
  assert.throws(
    () => toJsonSchema(string(), {
      target: "draft-07",
      schema: "https://json-schema.org/draft/2020-12/schema",
    }),
    /JSON Schema target "draft-07" conflicts with \$schema/,
  );
});

test("rejects opaque transform output instead of approximating it", () => {
  assert.throws(
    () => toJsonSchema(
      string().transform((value) => value.length),
      { side: "output" },
    ),
    /Cannot export opaque transform output/,
  );
});

test("adds a JSON Schema dialect when requested", () => {
  assert.deepEqual(toJsonSchema(string(), { schema: "https://json-schema.org/draft/2020-12/schema" }), {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "string",
  });
});
