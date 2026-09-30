import assert from "node:assert/strict";
import test from "node:test";
import { array, lazy, literal, number, object, string, union, type Schema } from "@safe-shape/core";
import { checkSchemaConnection, checkContractConnection, createContractSnapshotV2 } from "../src/index.js";

test("checked output containment proves safety without executing a mapper", () => {
  let calls = 0;
  const producer = string().transform((s) => { calls++; return Number(s); }).pipe(number({ minimum: 1, maximum: 10 }));
  const consumer = number({ minimum: 0 });
  const report = checkSchemaConnection(producer, consumer, { producerId: "api", consumerId: "client" });
  assert.equal(report.compatible, true);
  assert.equal(report.evidence, "output-bound");
  assert.equal(report.producer.id, "api");
  assert.equal(report.consumer.id, "client");
  assert.equal(calls, 0);
  assert.ok(Object.isFrozen(report.comparison.findings));
  assert.equal(report.counterexample.status, "unavailable");
  assert.equal(checkContractConnection(createContractSnapshotV2(producer), createContractSnapshotV2(consumer)).status, "unknown");
});

test("a rejected bound is not a breaking emitted value", () => {
  const producer = string().transform(() => 1).pipe(number({ minimum: 1, maximum: 10 }));
  const report = checkSchemaConnection(producer, literal(1));
  assert.equal(report.status, "unknown");
  assert.equal(report.compatible, false);
  assert.equal(report.migration.decision, "manual-review");
  assert.equal(report.counterexample.status, "unavailable");
  assert.equal(report.comparison.findings.some((finding) => finding.status === "breaking"), false);
  assert.equal(checkSchemaConnection(string().transform(Number), number()).status, "unknown");
  assert.equal(checkSchemaConnection(producer, number().refine(() => true)).status, "unknown");
  assert.throws(() => checkSchemaConnection(producer, number(), { producerId: "" }), /empty/);
});

test("every proven fixture connection accepts independently parsed output", () => {
  const checked = string().transform(Number).pipe(number({ minimum: 0, maximum: 10 }));
  const schemas: Schema<any, any>[] = [checked, number(), number({ minimum: 0 }), literal(1), string(),
    object({ value: checked }), object({ value: number() }), object({ value: number() }, { unknownProperties: "strip" }),
    array(checked), array(number()), union([checked, string()]), checked.transform(String)];
  const inputs: unknown[] = ["0", "1", "10", "11", "oops", -1, 0, 1, 10, {}, { value: "1" }, { value: 1 }, { value: "1", extra: true }, ["1"], [1]];
  let proofs = 0;
  for (const producer of schemas) for (const consumer of schemas) {
    const report = checkSchemaConnection(producer, consumer);
    if (!report.compatible) continue;
    proofs++;
    for (const input of inputs) {
      const output = producer.safeParse(input);
      if (output.success) assert.equal(consumer.safeParse(output.data).success, true);
    }
  }
  assert.ok(proofs > 10);
});

test("recursive bounds and async consumers stay conservative", () => {
  interface Node { value: number; children: readonly Node[] }
  let producer: Schema<Node, unknown>, consumer: Schema<Node>;
  producer = lazy(() => object({ value: string().transform(Number).pipe(number()), children: array(producer) }), { id: "source" });
  consumer = lazy(() => object({ value: number(), children: array(consumer) }), { id: "target" });
  assert.equal(checkSchemaConnection(producer, consumer).compatible, true);
  let calls = 0;
  const async = number().refineAsync(async () => { calls++; return true; }, { id: "async" });
  assert.equal(checkSchemaConnection(string().transform(Number).pipe(async), number()).status, "unknown");
  assert.equal(calls, 0);
});
