import assert from "node:assert/strict";
import test from "node:test";
import {
  discriminatedUnion,
  enum as enumSchema,
  literal,
  intersection,
  never as neverSchema,
  number,
  object,
  record,
  string,
  union,
  unknown as unknownSchema,
} from "@safe-shape/core";
import { validateSchema } from "../src/index.js";

test("returns JSON-friendly success reports", () => {
  const schema = object({
    id: string(),
    role: literal("admin"),
  });

  assert.deepEqual(validateSchema(schema, { id: "user_1", role: "admin" }), {
    valid: true,
    data: {
      id: "user_1",
      role: "admin",
    },
  });
});

test("returns explicit strip and passthrough object outputs", () => {
  assert.deepEqual(validateSchema(object(
    { id: string() },
    { unknownProperties: "strip" },
  ), { id: "user_1", extra: true }), {
    valid: true,
    data: { id: "user_1" },
  });
  assert.deepEqual(validateSchema(object(
    { id: string() },
    { unknownProperties: "passthrough" },
  ), { id: "user_1", extra: true }), {
    valid: true,
    data: { id: "user_1", extra: true },
  });
});

test("infers transformed schema output independently from input", () => {
  const report = validateSchema(
    string().transform((value) => value.length),
    "hello",
  );

  assert.deepEqual(report, {
    valid: true,
    data: 5,
  });

  if (report.valid) {
    const length: number = report.data;
    assert.equal(length, 5);
  }
});

test("returns JSON-friendly failure reports", () => {
  const schema = object({
    id: string(),
    role: literal("admin"),
  });
  const report = validateSchema(schema, { id: 42, role: "member" });

  assert.equal(report.valid, false);

  if (!report.valid) {
    assert.equal(report.issues.length, 2);
    assert.deepEqual(report.issues.map((issue) => issue.path), [["id"], ["role"]]);
  }
});

test("preserves ordered addressable custom diagnostic issues", () => {
  const report = validateSchema(object({
    period: object({ start: number(), end: number() }).refineWithIssues((value, context) => {
      if (value.start > value.end) {
        context.addIssue({ path: ["start"], message: "Start must not exceed end." });
        context.addIssue({ path: ["end"], message: "End must not precede start." });
      }
    }, { id: "ordered-period/v1" }),
  }), { period: { start: 5, end: 2 } });

  assert.equal(report.valid, false);
  if (!report.valid) {
    assert.deepEqual(report.issues.map((issue) => [issue.code, issue.path]), [
      ["custom", ["period", "start"]],
      ["custom", ["period", "end"]],
    ]);
    assert.equal(Object.isFrozen(report.issues), true);
  }
});

test("returns frozen report containers", () => {
  const success = validateSchema(string(), "ok");
  const failure = validateSchema(string(), 42);

  assert.equal(Object.isFrozen(success), true);
  assert.equal(Object.isFrozen(failure), true);

  if (!failure.valid) {
    assert.equal(Object.isFrozen(failure.issues), true);
  }
});

test("reports production primitive schemas without losing issue codes", () => {
  assert.deepEqual(validateSchema(enumSchema(["draft", "published"]), "draft"), {
    valid: true,
    data: "draft",
  });

  const payload = { source: "external" };
  assert.deepEqual(validateSchema(unknownSchema(), payload), {
    valid: true,
    data: payload,
  });

  const impossible = validateSchema(neverSchema(), "value");
  assert.equal(impossible.valid, false);
  if (!impossible.valid) assert.equal(impossible.issues[0]?.code, "forbidden_value");
});

test("reports structured composition diagnostics without collapsing them", () => {
  const eventSchema = discriminatedUnion("type", [
    object({ type: literal("created"), id: string() }),
    object({ type: literal("deleted"), id: string() }),
  ] as const);
  const event = validateSchema(eventSchema, { type: "created", id: 10 });
  assert.equal(event.valid, false);
  if (!event.valid) {
    assert.deepEqual(event.issues.map((issue) => [issue.code, issue.path]), [
      ["invalid_type", ["id"]],
    ]);
  }

  const conflicted = validateSchema(intersection(
    string().transform((value) => value.toUpperCase(), { id: "uppercase" }),
    string().transform((value) => value.toLowerCase(), { id: "lowercase" }),
  ), "Mixed");
  assert.equal(conflicted.valid, false);
  if (!conflicted.valid) {
    assert.equal(conflicted.issues[0]?.code, "intersection_conflict");
  }
});

test("preserves failed union branch diagnostics", () => {
  const report = validateSchema(object({
    role: union([literal("admin"), literal("member")]),
  }), { role: "owner" });

  assert.equal(report.valid, false);
  if (!report.valid) {
    const issue = report.issues[0]!;
    assert.equal(issue.code, "invalid_union");
    assert.deepEqual(issue.branches?.map((branch) => ({
      index: branch.index,
      codes: branch.issues.map((branchIssue) => branchIssue.code),
      paths: branch.issues.map((branchIssue) => branchIssue.path),
    })), [
      { index: 0, codes: ["invalid_literal"], paths: [["role"]] },
      { index: 1, codes: ["invalid_literal"], paths: [["role"]] },
    ]);
    assert.equal(Object.isFrozen(issue.branches), true);
  }
});

test("preserves native string pattern and format issue codes", () => {
  const report = validateSchema(object({
    email: string({ format: "email" }),
    code: string({ pattern: "^[A-Z]{3}$" }),
  }), {
    email: "not-an-email",
    code: "abc",
  });

  assert.equal(report.valid, false);
  if (!report.valid) {
    assert.deepEqual(report.issues.map((issue) => [issue.code, issue.path]), [
      ["invalid_string_format", ["email"]],
      ["invalid_string_pattern", ["code"]],
    ]);
  }
});

test("preserves multipleOf and record key diagnostics", () => {
  const report = validateSchema(object({
    amount: number({ multipleOf: 0.1 }),
    scores: record(number(), { key: { pattern: "^[a-z]+$" } }),
  }), {
    amount: 0.30000000000000004,
    scores: { invalid_key: "not-a-number" },
  });

  assert.equal(report.valid, false);
  if (!report.valid) {
    assert.deepEqual(report.issues.map((issue) => [issue.code, issue.path]), [
      ["not_multiple_of", ["amount"]],
      ["invalid_string_pattern", ["scores", "invalid_key"]],
      ["invalid_type", ["scores", "invalid_key"]],
    ]);
  }
});
