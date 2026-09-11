import assert from "node:assert/strict";
import test from "node:test";
import {
  array, literal, nullable, number, object, optional, record, string, tuple, union,
  type Schema,
} from "@safe-shape/core";
import { compareContracts, compareContractsV2, createContractSnapshot, parseContractSnapshot, createContractSnapshotV2, parseContractSnapshotV2 } from "../src/index.js";

// Fixed LCG seed and bounded grammar make every failure reproducible.
// Schemas are identity-producing: generated output checks do not conflate
// transforms or strip policies with acceptance (those have separate tests).
const seed = 0x5afe31;
function corpus() {
  let state = seed;
  const choose = (n: number) => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % n; };
  const schemas: { label: string; schema: Schema<any, any> }[] = [
    { label: "string", schema: string() },
    { label: "nonempty", schema: string({ minLength: 1 }) },
    { label: "short", schema: string({ maxLength: 2 }) },
    { label: "number", schema: number() },
    { label: "positive", schema: number({ minimum: 0 }) },
    { label: "a", schema: literal("a") },
  ];
  for (let i = 0; i < 36; i += 1) {
    const inner = schemas[choose(Math.min(schemas.length, 18))]!;
    const kind = choose(7);
    const schema = [
      () => array(inner.schema, { maxLength: 2 }),
      () => tuple([inner.schema]),
      () => object({ value: inner.schema }),
      () => optional(inner.schema),
      () => nullable(inner.schema),
      () => union([inner.schema, literal(null)]),
      () => record(inner.schema),
    ][kind]!();
    schemas.push({ label: `${kind}(${inner.label})`, schema });
  }
  return schemas;
}

test("seeded nested grammar challenges safe input and output proofs", () => {
  const atoms: unknown[] = [undefined, null, false, -1, 0, 1, "", "a", "abc"];
  const level = (values: unknown[]) => values.flatMap((value) => [[value], { value }, { extra: value }]);
  const first = level(atoms);
  const values = [...atoms, [], {}, ...first, ...level(first)];
  const schemas = corpus();
  for (const previous of schemas) for (const next of schemas) {
    const before = values.map((value) => previous.schema.safeParse(value));
    const after = values.map((value) => next.schema.safeParse(value));
    for (const compatibility of ["backward", "forward", "full"] as const) {
      const v1 = compareContracts(previous.schema, next.schema, { compatibility });
      for (const side of ["input", "output"] as const) {
        const report = compareContractsV2(previous.schema, next.schema, { compatibility, side });
        const context = `seed=${seed}; ${previous.label} -> ${next.label}; ${compatibility}/${side}`;
        if (side === "input") assert.equal(report.status, v1.status, context);
        if (report.status !== "safe") continue;
        for (const [i, value] of values.entries()) {
          const left = before[i]!;
          const right = after[i]!;
          const witness = `${context}; witness=${JSON.stringify(value) ?? "undefined"}`;
          if (compatibility !== "forward" && left.success) {
            assert.equal(right.success, true, witness);
            if (side === "output") assert.deepEqual(next.schema.parse(left.data), left.data, witness);
          }
          if (compatibility !== "backward" && right.success) {
            assert.equal(left.success, true, witness);
            if (side === "output") assert.deepEqual(previous.schema.parse(right.data), right.data, witness);
          }
        }
      }
    }
  }
});

test("prototype-sensitive contract keys survive runtime and snapshot round trips", () => {
  const shape = JSON.parse('{"__proto__":null,"constructor":null,"prototype":null}');
  for (const key of Object.keys(shape)) shape[key] = string();
  const schema = object(shape);
  const input = JSON.parse('{"__proto__":"a","constructor":"b","prototype":"c"}');
  assert.deepEqual(schema.parse(input), input);
  const snapshot = createContractSnapshotV2(schema, { id: "keys" });
  assert.deepEqual(parseContractSnapshotV2(JSON.parse(JSON.stringify(snapshot))), snapshot);
  assert.equal(compareContractsV2(schema, schema, { compatibility: "full" }).status, "safe");
  assert.equal(Object.hasOwn({}, "polluted"), false);
});

test("equal graph literal leaves preserve nullable and optional union equivalence", () => {
  for (const [previous, next] of [
    [union([string(), literal(null)]), nullable(string())],
    [union([string(), literal(undefined)]), optional(string())],
  ] as const) {
    for (const side of ["input", "output"] as const) {
      for (const compatibility of ["backward", "forward", "full"] as const) {
        assert.equal(compareContractsV2(previous, next, { side, compatibility }).status, "safe");
      }
    }
  }
  assert.equal(compareContractsV2(literal("a"), literal("b")).status, "breaking");
  assert.equal(compareContractsV2(literal(null).refine(() => true), literal(null)).status, "unknown");
});

test("required prototype-sensitive additions cannot receive false safe proofs", () => {
  for (const key of ["__proto__", "constructor", "toString"]) {
    const previous = object({});
    const next = object({ [key]: string() });
    assert.equal(previous.safeParse({}).success, true);
    assert.equal(next.safeParse({}).success, false);
    assert.equal(compareContracts(previous, next).status, "breaking", key);
    for (const side of ["input", "output"] as const) {
      assert.equal(compareContractsV2(previous, next, { side }).status, "breaking", key);
      assert.equal(compareContractsV2(next, previous, { side, compatibility: "forward" }).status, "breaking", key);
    }
    const legacy = createContractSnapshot(next, { id: "keys" });
    assert.deepEqual(parseContractSnapshot(JSON.parse(JSON.stringify(legacy))), legacy);
    const snapshot = createContractSnapshotV2(next, { id: "keys" });
    if (snapshot.input.root.kind !== "object") throw new Error("Expected object root");
    assert.equal(Object.hasOwn(snapshot.input.root.shape, key), true);
    assert.deepEqual(parseContractSnapshotV2(JSON.parse(JSON.stringify(snapshot))), snapshot);
  }
});


test("snapshot parsers reject required keys inherited rather than declared in shape", () => {
  for (const key of ["__proto__", "constructor", "toString"]) {
    const legacy = JSON.parse(JSON.stringify(createContractSnapshot(object({}), { id: "keys" })));
    legacy.contract.required = [key];
    assert.throws(() => parseContractSnapshot(legacy), /required must contain unique keys from shape/);
    const graph = JSON.parse(JSON.stringify(createContractSnapshotV2(object({}), { id: "keys" })));
    graph.input.root.required = [key];
    assert.throws(() => parseContractSnapshotV2(graph), /required must contain unique keys from shape/);
  }
});
