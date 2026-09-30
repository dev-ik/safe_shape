import assert from "node:assert/strict";
import test from "node:test";
import { array, intersection, lazy, number, object, string, type Schema } from "@safe-shape/core";
import { safeToJsonSchema, toJsonSchema } from "../src/index.js";

test("output bounds are opt-in, labelled and dialect-aware", () => {
  let calls = 0;
  const pipeline = string().transform((value) => { calls++; return Number(value); }).pipe(number({ minimum: 1 }));
  assert.equal(safeToJsonSchema(pipeline, { side: "output" }).success, false);
  assert.equal(safeToJsonSchema(pipeline, { mode: "output-bound" }).success, false);
  assert.equal(safeToJsonSchema(pipeline, { mode: "output-bound", side: "input" }).success, false);
  for (const target of ["draft-07", "draft-2020-12"] as const) {
    const result = safeToJsonSchema(pipeline, { side: "output", mode: "output-bound", target });
    assert.ok(result.success);
    assert.equal(result.schema.type, "number");
    assert.equal(result.schema.minimum, 1);
    assert.equal(result.warnings[0]?.code, "json_schema.output.bound");
    assert.equal(result.warnings[0]?.severity, "warning");
    assert.ok(Object.isFrozen(result.warnings[0]?.path));
  }
  assert.equal(calls, 0);
});

test("nested checked output exports preserve recursive definitions and strip policies", () => {
  interface Node { value: number; children: readonly Node[] }
  let node: Schema<Node, unknown>;
  node = lazy(() => object({ value: string().transform(Number).pipe(number()), children: array(node) }, { unknownProperties: "strip" }), { id: "Node" });
  for (const target of ["draft-07", "draft-2020-12"] as const) {
    const result = toJsonSchema(node, { side: "output", mode: "output-bound", target });
    const defs = result[target === "draft-07" ? "definitions" : "$defs"] as Record<string, Record<string, unknown>>;
    assert.equal(defs.Node?.additionalProperties, false);
    assert.equal(result.$ref, target === "draft-07" ? "#/definitions/Node" : "#/$defs/Node");
  }
});

test("output-bound mode cannot erase final transforms or real opaque rules", () => {
  const checked = string().transform(Number).pipe(number());
  for (const schema of [checked.transform(String), checked.refine(() => true, { id: "real" }), intersection(object({}), object({}))]) {
    assert.equal(safeToJsonSchema(schema, { side: "output", mode: "output-bound" }).success, false);
  }
});
