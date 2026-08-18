import assert from "node:assert/strict";
import test from "node:test";
import {
  createContractSnapshot,
  createContractSnapshotV2,
  createStandardJsonSchema,
  describeContract,
  discriminatedUnion,
  enum as enumSchema,
  httpContract,
  intersection,
  lazy,
  literal,
  never as neverSchema,
  number,
  object,
  record,
  safeToJsonSchema,
  safeParseHttpRequest,
  string,
  toJsonSchema,
  toTypeScriptType,
  union,
  unknown as unknownSchema,
  validateSchema,
  type InferInput,
  type InferOutput,
  type StandardSchemaV1,
  type StandardJSONSchemaV1,
} from "../src/index.js";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;

type Expect<Value extends true> = Value;

test("umbrella package exposes runtime and tooling helpers", () => {
  const userSchema = object({
    id: string().annotate({ title: "User id" }),
  }).annotate({ title: "User" });

  assert.deepEqual(userSchema.parse({ id: "user_1" }), { id: "user_1" });
  assert.deepEqual(validateSchema(userSchema, { id: "user_1" }), {
    valid: true,
    data: { id: "user_1" },
  });
  assert.equal(toJsonSchema(userSchema).title, "User");
  assert.equal(createContractSnapshot(userSchema, { id: "user" }).id, "user");
  assert.equal(createContractSnapshotV2(userSchema, { id: "user" }).format, "safe-shape.contract/v2");
  assert.deepEqual(enumSchema(["draft", "published"]).parse("draft"), "draft");
  assert.equal(unknownSchema().parse(userSchema), userSchema);
  assert.equal(neverSchema().safeParse("value").success, false);
  assert.deepEqual(discriminatedUnion("type", [
    object({ type: literal("created") }),
    object({ type: literal("deleted") }),
  ] as const).parse({ type: "created" }), { type: "created" });
  assert.equal(intersection(string({ minLength: 1 }), string({ maxLength: 10 })).parse("ok"), "ok");
  assert.equal(string({ format: "uuid" }).parse("550e8400-e29b-41d4-a716-446655440000"), "550e8400-e29b-41d4-a716-446655440000");
  assert.equal(number({ multipleOf: 0.01 }).parse(12.34), 12.34);
  assert.deepEqual(
    record(string(), { key: { pattern: "^[a-z]+$" } }).parse({ primary: "safe" }),
    { primary: "safe" },
  );
  assert.deepEqual(object(
    { id: string() },
    { unknownProperties: "strip" },
  ).parse({ id: "user_1", removed: true }), { id: "user_1" });
  const addressable = object({ start: number(), end: number() }).refineWithIssues(
    (value, context) => {
      if (value.start > value.end) {
        context.addIssue({ path: ["end"], message: "End must not precede start." });
      }
    },
    { id: "ordered-period/v1" },
  );
  const addressableReport = validateSchema(addressable, { start: 5, end: 2 });
  assert.equal(addressableReport.valid, false);
  if (!addressableReport.valid) {
    assert.deepEqual(addressableReport.issues[0]?.path, ["end"]);
  }
  const failedUnion = union([literal("admin"), literal("member")]).safeParse("owner");
  assert.equal(failedUnion.success, false);
  if (!failedUnion.success) {
    assert.deepEqual(failedUnion.error.issues[0]?.branches?.map((branch) => branch.index), [0, 1]);
  }
  assert.equal(toTypeScriptType(userSchema, { name: "User" }), `export type User = {
  id: string;
};
`);

  const contract = httpContract({
    params: object({ id: string() }),
  });
  const request = safeParseHttpRequest(contract, { params: { id: "user_1" } });

  assert.equal(request.success, true);

  const lengthSchema = string().transform((value) => value.length);
  type LengthInput = InferInput<typeof lengthSchema>;
  type LengthOutput = InferOutput<typeof lengthSchema>;
  type InputExpectation = Expect<Equal<LengthInput, string>>;
  type OutputExpectation = Expect<Equal<LengthOutput, number>>;
  const inputExpectation: InputExpectation = true;
  const outputExpectation: OutputExpectation = true;

  assert.equal(inputExpectation, true);
  assert.equal(outputExpectation, true);

  const standardSchema: StandardSchemaV1<string, number> = lengthSchema;
  const standardResult = standardSchema["~standard"].validate("hello");
  assert.equal(standardResult instanceof Promise, false);
  if (!(standardResult instanceof Promise)) {
    assert.deepEqual(standardResult, { value: 5 });
  }

  const standardJsonSchema = createStandardJsonSchema(lengthSchema);
  const standardJsonSchemaType: StandardJSONSchemaV1<string, number> = standardJsonSchema;
  assert.deepEqual(standardJsonSchemaType["~standard"].jsonSchema.input({
    target: "draft-2020-12",
  }), {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "string",
  });

  const failedJsonSchema = safeToJsonSchema(
    string().refine((value) => value.length > 0, { id: "non-empty/v1" }),
  );
  assert.equal(failedJsonSchema.success, false);
  if (!failedJsonSchema.success) {
    assert.equal(
      failedJsonSchema.issues[0]?.code,
      "json_schema.refinement.unrepresentable",
    );
  }
  assert.deepEqual(standardJsonSchemaType["~standard"].jsonSchema.input({
    target: "draft-07",
    libraryOptions: { id: "https://example.com/contracts/length" },
  }), {
    $schema: "http://json-schema.org/draft-07/schema#",
    $id: "https://example.com/contracts/length",
    type: "string",
  });

  const referenced = lazy(() => string(), { id: "ReferencedString" });
  assert.deepEqual(describeContract(referenced).input.root, {
    kind: "reference",
    id: "ReferencedString",
  });
});
