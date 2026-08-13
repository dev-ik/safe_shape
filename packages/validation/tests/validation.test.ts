import assert from "node:assert/strict";
import test from "node:test";
import { literal, object, string } from "@safe-shape/core";
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

test("returns frozen report containers", () => {
  const success = validateSchema(string(), "ok");
  const failure = validateSchema(string(), 42);

  assert.equal(Object.isFrozen(success), true);
  assert.equal(Object.isFrozen(failure), true);

  if (!failure.valid) {
    assert.equal(Object.isFrozen(failure.issues), true);
  }
});
