import assert from "node:assert/strict";
import test from "node:test";
import { object, string, number, literal, union, describeContract, describeSchema, type ObjectSchemaType, type Schema } from "../src/index.js";

test("object composition preserves fields, policy, annotations and immutable sources", () => {
  const id = string({ minLength: 1 }).annotate({ title: "Identifier" });
  const source = object({ id, name: string(), age: number().optional() }, { unknownProperties: "strip" }).annotate({ title: "User" });
  const edit = source.omit(["id"]).partial();
  assert.deepEqual(edit.parse({ extra: true }), {});
  assert.equal(source.safeParse({}).success, false);
  assert.equal(source.pick(["id"]).shape.id, id);
  assert.equal(describeSchema(edit).metadata?.title, "User");
  assert.ok(Object.isFrozen(source.shape));
  assert.ok(Object.isFrozen(edit));
  assert.deepEqual(source.pick(["id"]).extend({ active: number() }).parse({ id: "a", active: 1 }), { id: "a", active: 1 });
  assert.throws(() => source.extend({ id: number() }), /cannot replace/);
  assert.throws(() => source.pick(["absent"] as never), /existing fields/);
});

test("shape changes never silently discard object rules", () => {
  const checked = object({ name: string() }).refine(() => false, { id: "rule" });
  const unsafe = checked as ObjectSchemaType<{ name: ReturnType<typeof string> }>;
  for (const change of [() => unsafe.pick(["name"]), () => unsafe.omit([]), () => unsafe.partial(), () => unsafe.required(), () => unsafe.extend({ count: number() })]) {
    assert.throws(change, /before adding object-level checks/);
  }
  assert.equal(unsafe.annotate({ title: "checked" }).safeParse({ name: "a" }).success, false);
});

test("required preserves field refinements, async rules and warnings", async () => {
  const field = string().optional().refine((v) => v !== "bad", { id: "not-bad" }).warn(() => false, { id: "warning" });
  const required = object({ field }).required();
  assert.equal(required.safeParse({}).success, false);
  assert.equal(required.safeParse({ field: undefined }).success, false);
  assert.equal(required.safeParse({ field: "bad" }).success, false);
  const valid = required.safeParse({ field: "ok" });
  assert.ok(valid.success);
  assert.equal(valid.warnings?.length, 1);
  const asyncObject = object({ field: string().optional().refineAsync(async (v) => v !== "bad", { id: "async" }) }).required();
  assert.throws(() => asyncObject.parse({ field: "ok" }), /async rules/);
  assert.equal((await asyncObject.safeParseAsync({ field: "bad" })).success, false);
  assert.equal(object({ field: string().transform(() => undefined) }).required().safeParse({ field: "a" }).success, false);
});

test("composition preserves prototype-sensitive fields and nested requiredness", () => {
  const base = object({ ["__proto__"]: string(), child: object({ id: string() }) });
  const selected = base.pick(["__proto__"]);
  const parsed = selected.parse(JSON.parse('{"__proto__":"own"}'));
  assert.equal(Object.getOwnPropertyDescriptor(parsed, "__proto__")?.value, "own");
  assert.equal(base.partial().safeParse({ child: {} }).success, false);
  const required = object({ value: string().optional().nullable() }).required();
  assert.equal(required.safeParse({ value: undefined }).success, false);
  assert.deepEqual(required.parse({ value: null }), { value: null });
  const definition = describeContract(required).input.root;
  assert.equal(definition.kind, "object");
  if (definition.kind === "object") assert.deepEqual(definition.shape.value, { kind: "nullable", inner: { kind: "string" } });
});

test("pipelines short-circuit and preserve stage warnings and nested paths", () => {
  let calls = 0;
  const first = string().warn(() => false, { id: "first" }).transform((v) => { calls++; return Number(v); });
  const next = number({ minimum: 1 }).warn(() => false, { id: "next" });
  const composed = object({ age: first.pipe(next) });
  const invalidInput = composed.safeParse({ age: 4 });
  assert.equal(invalidInput.success, false);
  assert.equal(calls, 0);
  const invalidOutput = composed.safeParse({ age: "0" });
  assert.ok(!invalidOutput.success);
  assert.deepEqual(invalidOutput.error.issues[0]?.path, ["age"]);
  assert.equal(invalidOutput.error.warnings[0]?.ruleId, "first");
  const valid = composed.safeParse({ age: "2" });
  assert.ok(valid.success);
  assert.deepEqual(valid.data, { age: 2 });
  assert.deepEqual(valid.warnings?.map((warning) => warning.ruleId), ["first", "next"]);
  assert.ok(Object.isFrozen(valid.warnings));
  const output = describeContract(first.pipe(next)).output.root;
  assert.equal(output.kind, "number");
  assert.ok(output.refinements?.includes(null));
});

test("async pipeline execution stays explicit through Standard Schema", async () => {
  const pipeline = string().transform((v) => v.length).pipe(number().refineAsync(async (v) => v > 2, { id: "length" }));
  assert.throws(() => pipeline.safeParse("abc"), /async rules/);
  assert.equal((await pipeline.safeParseAsync("x")).success, false);
  const standard = await pipeline["~standard"].validate("abcd");
  assert.ok("value" in standard);
  assert.equal(standard.value, 4);
  assert.equal(object({ value: string().optional().pipe(string().optional()) }).safeParse({}).success, false);
});

test("required and partial combinations preserve defined values and explicit null", async () => {
  const fields: Schema<any, any>[] = [
    string().optional(), string().optional().nullable(),
    union([literal(undefined), string()]),
    string().optional().transform((value) => value),
    string().transform(() => undefined),
    string().optional().pipe(string().optional()),
  ];
  for (const field of fields) {
    const schema = object({ value: field });
    const required = schema.partial().required();
    for (const input of [{}, { value: undefined }, { value: null }, { value: "ok" }, { value: 1 }]) {
      const own = Object.hasOwn(input, "value");
      const original = own ? await field.safeParseAsync(input.value) : undefined;
      const expected = own && input.value !== undefined && original?.success === true && original.data !== undefined;
      assert.equal(required.safeParse(input).success, expected);
      assert.equal((await required.safeParseAsync(input)).success, expected);
    }
    assert.equal(schema.required().partial().safeParse({}).success, true);
    assert.equal(schema.required().partial().safeParse({ value: undefined }).success, true);
  }
});

test("async pipeline failures keep stage warnings and never run later stages", async () => {
  const calls: string[] = [];
  const schema = object({ value: string()
    .warnAsync(async () => { calls.push("warning"); return false; }, { id: "first" })
    .transform((value) => { calls.push("transform"); return value.length; })
    .pipe(number().refineAsync(async () => { calls.push("check"); return false; }, { id: "second" }))
    .pipe(number().transform((value) => { calls.push("unreachable"); return value; })) });
  const result = await schema.safeParseAsync({ value: "value" });
  assert.ok(!result.success);
  assert.deepEqual(calls, ["warning", "transform", "check"]);
  assert.deepEqual(result.error.issues.map((issue) => [issue.ruleId, issue.path]), [["second", ["value"]]]);
  assert.deepEqual(result.error.warnings.map((warning) => [warning.ruleId, warning.path]), [["first", ["value"]]]);
});
