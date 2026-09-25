import assert from "node:assert/strict";
import test from "node:test";
import { array, discriminatedUnion, enumeration, intersection, lazy, literal, number, object, string, tuple, union, type Schema } from "@safe-shape/core";
import { checkContractConnection, createContractCounterexamples, createContractSnapshot, createContractSnapshotV2 } from "../src/index.js";

test("connections compare producer output to consumer input with explicit identities", () => {
  const producer = createContractSnapshotV2(object({ status: enumeration(["active", "paused"]) }), { id: "service@2" });
  const consumer = createContractSnapshotV2(object({ status: literal("active") }), { id: "client@1" });
  const report = checkContractConnection(producer, consumer);
  assert.equal(report.status, "breaking");
  assert.equal(report.migration.decision, "migration-required");
  assert.equal(report.producer.id, "service@2");
  assert.equal(report.consumer.side, "input");
  assert.deepEqual(report.counterexample, { status: "available", value: { status: "paused" }, producerInput: { status: "paused" } });
  assert.ok(Object.isFrozen(report.counterexample));
  assert.equal(checkContractConnection(consumer, producer).compatible, true);
  assert.throws(() => checkContractConnection({ ...producer, fingerprint: "tampered" }, consumer), /fingerprint/);
});

test("output projection accounts for stripping and opaque production", () => {
  const check = (producer: Schema<any, any>, consumer: Schema<any, any>) => checkContractConnection(createContractSnapshotV2(producer), createContractSnapshotV2(consumer));
  assert.equal(check(object({ id: string() }, { unknownProperties: "strip" }), object({ id: string() })).compatible, true);
  assert.equal(check(string().transform((value) => value.length), number()).status, "unknown");
  assert.equal(check(string().transform((value) => value.length).pipe(number()), number()).status, "unknown");
  const merged = intersection(object({ a: string() }, { unknownProperties: "strip" }), object({ b: string() }, { unknownProperties: "strip" }));
  assert.equal(check(merged, object({ a: string() })).status, "unknown");
  // Second branch accepts extra, but first branch strips it from every output.
  const firstWins = union([object({ id: string() }, { unknownProperties: "strip" }), object({ id: string(), extra: number() })]);
  const report = check(firstWins, object({ id: string() }));
  assert.equal(report.status, "unknown");
  assert.equal(report.counterexample.status, "unavailable");
});

test("connection safety and witnesses agree with independently executed producers", () => {
  const schemas: Schema<any, any>[] = [string(), number(), literal("a"), enumeration(["a", "b"]),
    object({ id: string() }), object({ id: string() }, { unknownProperties: "strip" }),
    object({ id: string() }, { unknownProperties: "passthrough" }),
    tuple([string(), number()]), array(string()),
    union([object({ id: string() }, { unknownProperties: "strip" }), object({ extra: number() })])];
  const inputs: unknown[] = ["a", "b", "", 0, 1, {}, { id: "a" }, { id: "a", extra: 2 }, { extra: 1 }, ["a"], ["a", 1], []];
  for (const producer of schemas) for (const consumer of schemas) {
    const report = checkContractConnection(createContractSnapshotV2(producer), createContractSnapshotV2(consumer));
    if (report.compatible) for (const value of inputs) {
      const produced = producer.safeParse(value);
      if (produced.success) assert.equal(consumer.safeParse(produced.data).success, true);
    }
    if (report.counterexample.status === "available") {
      const produced = producer.safeParse(report.counterexample.producerInput);
      assert.ok(produced.success);
      assert.deepEqual(produced.data, report.counterexample.value);
      assert.equal(consumer.safeParse(produced.data).success, false);
    }
  }
});

test("recursive connections retain coinductive safety without inventing witnesses", () => {
  interface Tree { id: string; children: readonly Tree[]; }
  let producer: Schema<Tree>, consumer: Schema<Tree>;
  producer = lazy(() => object({ id: string({ minLength: 2 }), children: array(producer) }), { id: "source" });
  consumer = lazy(() => object({ id: string(), children: array(consumer) }), { id: "target" });
  assert.equal(checkContractConnection(createContractSnapshotV2(producer), createContractSnapshotV2(consumer)).compatible, true);
});

test("tagged and tuple witnesses are checked against both original runtimes", () => {
  const tag = (value: "a" | "b") => object({ kind: literal(value), payload: tuple([string(), number()]) });
  const schemas: Schema<unknown>[] = [tuple([]), tuple([string()]), tuple([string({ minLength: 2 })]), tuple([string(), number()]),
    discriminatedUnion("kind", [tag("a"), tag("b")]), discriminatedUnion("kind", [tag("a")])];
  let found = 0;
  for (const snapshot of [createContractSnapshot, createContractSnapshotV2]) {
    for (const source of schemas) for (const target of schemas) {
      for (const result of createContractCounterexamples(snapshot(source), snapshot(target), { compatibility: "full" })) {
        if (result.status !== "available") continue;
        found++;
        assert.equal((result.direction === "backward" ? source : target).safeParse(result.value).success, true);
        assert.equal((result.direction === "backward" ? target : source).safeParse(result.value).success, false);
      }
    }
  }
  assert.ok(found > 20);
  const limited = tuple(Array.from({ length: 17 }, () => string()));
  const result = createContractCounterexamples(createContractSnapshot(limited), createContractSnapshot(tuple([])))[0]!;
  assert.equal(result.status === "unavailable" && result.reason, "construction-limit");
});

test("nested policies, optional members and union order agree with actual production", () => {
  const schemas: Schema<any, any>[] = [];
  for (const unknownProperties of ["reject", "strip", "passthrough"] as const) {
    for (const shape of [{ name: string() }, { name: string().optional() }, { name: literal("a") }]) {
      const item = object(shape, { unknownProperties });
      schemas.push(item, object({ payload: item }));
    }
  }
  const stripping = object({ name: string() }, { unknownProperties: "strip" });
  const preserving = object({ name: string(), extra: number() });
  schemas.push(union([stripping, preserving]), union([preserving, stripping]),
    array(stripping), array(preserving), tuple([stripping]), tuple([preserving]),
    string().transform((value) => ({ name: value })).pipe(object({ name: string() })),
    object({ name: string().optional() }).partial().required());
  const atoms: unknown[] = [undefined, null, false, 1, "a", "b", {}, { name: undefined },
    { name: "a" }, { name: "b" }, { name: "a", extra: 1 }, { extra: 1 }];
  const inputs = [...atoms, ...atoms.map((payload) => ({ payload })), ...atoms.map((value) => [value])];
  let witnesses = 0, compatible = 0, unknown = 0;
  for (const producer of schemas) for (const consumer of schemas) {
    const report = checkContractConnection(createContractSnapshotV2(producer), createContractSnapshotV2(consumer));
    if (report.status === "unknown") unknown++;
    if (report.compatible) {
      compatible++;
      for (const input of inputs) {
        const produced = producer.safeParse(input);
        if (produced.success) assert.equal(consumer.safeParse(produced.data).success, true, "claimed-compatible connection rejected an actual output");
      }
    }
    if (report.counterexample.status === "available") {
      witnesses++;
      const produced = producer.safeParse(report.counterexample.producerInput);
      assert.ok(produced.success, "witness input rejected by original producer");
      assert.deepEqual(produced.data, report.counterexample.value, "witness differs from actual produced value");
      assert.equal(consumer.safeParse(produced.data).success, false, "witness accepted by original consumer");
    }
  }
  assert.ok(witnesses > 20 && compatible > 20 && unknown > 0);
});
