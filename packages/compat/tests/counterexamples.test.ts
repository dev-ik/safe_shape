import assert from "node:assert/strict";
import test from "node:test";
import { array, discriminatedUnion, lazy, nullable, optional, tuple, union, boolean, enum as enumSchema, literal, never, number, object, string, unknown, type Schema } from "@safe-shape/core";
import { createContractCounterexamples, createContractSnapshot, createContractSnapshotV2 } from "../src/index.js";

test("scalar witnesses independently satisfy runtime containment violations in both formats and directions", () => {
  const schemas: Schema<unknown>[] = [unknown(), never(), boolean(), string(), literal(null), literal("a"),
    literal(1), enumSchema(["a", "b"]), enumSchema([1, 2]), number(),
    number({ minimum: 0 }), number({ maximum: 0 }), number({ minimum: 0.1, maximum: 0.2 }),
    number({ integer: true }), number({ multipleOf: 0.1 }), number({ minimum: Number.MAX_VALUE }),
    number({ maximum: -Number.MAX_VALUE }), number({ minimum: Number.MIN_VALUE }),
    string({ minLength: 1 }), string({ maxLength: 0 }), string({ minLength: 2, maxLength: 3 }),
    string({ minLength: 1025 }), literal("😀"), literal("e\u0301")];
  let witnessed = 0;
  for (const snapshot of [createContractSnapshot, createContractSnapshotV2]) {
    for (const previous of schemas) for (const next of schemas) {
      const results = createContractCounterexamples(snapshot(previous), snapshot(next), { compatibility: "full" });
      assert.deepEqual(results.map((result) => result.direction), ["backward", "forward"]);
      assert.ok(Object.isFrozen(results));
      assert.deepEqual(results, createContractCounterexamples(snapshot(previous), snapshot(next), { compatibility: "full" }));
      for (const result of results) {
        assert.ok(Object.isFrozen(result));
        assert.ok(Object.isFrozen(result.path));
        assert.deepEqual(result.path, []);
        if (result.status !== "available") continue;
        witnessed++;
        const source = result.source === "previous" ? previous : next;
        const target = result.target === "previous" ? previous : next;
        assert.equal(source.safeParse(result.value).success, true);
        assert.equal(target.safeParse(result.value).success, false);
        assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
      }
    }
  }
  assert.ok(witnessed > 100);
});

test("finds finite and adjacent numeric witnesses with honest unavailable outcomes", () => {
  const check = (previous: Schema<unknown>, next: Schema<unknown>) => createContractCounterexamples(createContractSnapshot(previous), createContractSnapshot(next))[0]!;
  assert.deepEqual(check(enumSchema(["a", "b"]), literal("a")), {
    direction: "backward", side: "input", source: "previous", target: "next", path: [], status: "available", value: "b",
  });
  const narrow = check(number({ minimum: 0, maximum: 1 }), number({ minimum: Number.MIN_VALUE, maximum: 1 }));
  assert.equal(narrow.status, "available");
  if (narrow.status === "available") assert.equal(narrow.value, 0);
  assert.equal(check(literal(1), literal(1)).status, "unavailable");
  const large = enumSchema(Array.from({ length: 130 }, (_, index) => index) as [number, ...number[]]);
  const limited = check(large, number());
  assert.equal(limited.status === "unavailable" && limited.reason, "candidate-limit");
});

test("does not execute opaque callbacks or approximate composite and output domains", () => {
  let calls = 0;
  for (const schema of [number().refine(() => { calls++; return true; }, { id: "rule" }),
    string({ pattern: "a" }), literal(undefined), literal(-0)]) {
    const result = createContractCounterexamples(createContractSnapshot(schema), createContractSnapshot(never()))[0]!;
    assert.equal(result.status === "unavailable" && result.reason, "unsupported-domain");
  }
  assert.equal(calls, 0);
  const output = createContractCounterexamples(createContractSnapshotV2(literal(1)), createContractSnapshotV2(never()), { side: "output" })[0]!;
  assert.equal(output.status === "unavailable" && output.reason, "unsupported-side");
});

test("validates snapshots, formats and options", () => {
  const snapshot = createContractSnapshot(number());
  assert.throws(() => createContractCounterexamples({ ...snapshot, fingerprint: "invalid" }, snapshot));
  assert.throws(() => createContractCounterexamples(snapshot, createContractSnapshotV2(number())));
  // @ts-expect-error invalid public option
  assert.throws(() => createContractCounterexamples(snapshot, snapshot, { compatibility: "invalid" }));
  // @ts-expect-error invalid public side
  assert.throws(() => createContractCounterexamples(snapshot, snapshot, { side: "invalid" }));
});

test("string boundaries and Unicode witnesses preserve runtime code-point semantics", () => {
  for (const snapshot of [createContractSnapshot, createContractSnapshotV2]) {
    for (const [source, target, expected] of [
      [string({ minLength: 2 }), string({ minLength: 3 }), "aa"],
      [string({ maxLength: 3 }), string({ maxLength: 2 }), "aaa"],
      [string({ minLength: 1, maxLength: 1 }), literal("a"), "b"],
      [literal("😀"), string({ minLength: 2 }), "😀"],
      [literal("e\u0301"), string({ maxLength: 1 }), "e\u0301"],
      [string({ maxLength: 0 }), string({ minLength: 1 }), ""],
    ] as const) {
      const [result] = createContractCounterexamples(snapshot(source), snapshot(target));
      assert.equal(result?.status, "available");
      if (result?.status === "available") {
        assert.equal(result.value, expected);
        assert.equal(source.safeParse(result.value).success, true);
        assert.equal(target.safeParse(result.value).success, false);
      }
      const [reverse] = createContractCounterexamples(snapshot(target), snapshot(source), { compatibility: "forward" });
      assert.equal(reverse?.status === "available" && reverse.value, expected);
    }
  }
});

test("string construction is bounded without suppressing available witnesses", () => {
  const check = (source: Schema<unknown>, target: Schema<unknown>) =>
    createContractCounterexamples(createContractSnapshotV2(source), createContractSnapshotV2(target))[0]!;
  const atLimit = check(string({ minLength: 1024 }), string({ minLength: 1025 }));
  assert.equal(atLimit.status === "available" && typeof atLimit.value === "string" && atLimit.value.length, 1024);
  for (const minimum of [1025, Number.MAX_SAFE_INTEGER]) {
    const result = check(string({ minLength: minimum }), never());
    assert.equal(result.status === "unavailable" && result.reason, "construction-limit");
  }
  const found = check(string({ maxLength: 2048 }), string({ minLength: 1 }));
  assert.equal(found.status === "available" && found.value, "");
  const literalValue = "😀".repeat(1025);
  const supplied = check(literal(literalValue), string({ maxLength: 1024 }));
  assert.equal(supplied.status === "available" && supplied.value, literalValue);
  const equal = check(string({ minLength: 2, maxLength: 3 }), string({ minLength: 2, maxLength: 3 }));
  assert.equal(equal.status === "unavailable" && equal.reason, "no-witness-found");
  for (const unsupported of [string({ pattern: "" }), string({ format: "email" })]) {
    const result = check(unsupported, never());
    assert.equal(result.status === "unavailable" && result.reason, "unsupported-domain");
  }
});

test("constructs full composite witnesses for API contract changes", () => {
  const cases: readonly (readonly [Schema<unknown>, Schema<unknown>])[] = [
    [object({}), object({ id: string() })],
    [object({ user: object({ name: string({ minLength: 2 }) }) }), object({ user: object({ name: string({ minLength: 3 }) }) })],
    [object({ role: enumSchema(["admin", "member"]) }), object({ role: literal("admin") })],
    [object({ id: optional(string()) }), object({ id: string() })],
    [object({ id: nullable(string()) }), object({ id: string() })],
    [object({}, { unknownProperties: "passthrough" }), object({})],
    [object({}, { unknownProperties: "strip" }), object({})],
    [object({}), object({ ["__proto__"]: string() })],
    [object({ ["__proto__"]: string({ minLength: 1 }) }), object({ ["__proto__"]: string({ minLength: 2 }) })],
    [array(number(), { maxLength: 3 }), array(number(), { maxLength: 2 })],
    [array(number(), { minLength: 1 }), array(number(), { minLength: 2 })],
    [array(object({ role: enumSchema(["a", "b"]) }), { minLength: 1 }), array(object({ role: literal("a") }), { minLength: 1 })],
    [union([object({ kind: literal("a") }), object({ kind: literal("b") })]), object({ kind: literal("a") })],
    [object({ values: array(union([literal("a"), literal("b")]), { minLength: 1 }) }), object({ values: array(literal("a")), })],
  ];
  for (const snapshot of [createContractSnapshot, createContractSnapshotV2]) {
    for (const [source, target] of cases) {
      for (const direction of ["backward", "forward"] as const) {
        const [result] = createContractCounterexamples(snapshot(direction === "backward" ? source : target),
          snapshot(direction === "backward" ? target : source), { compatibility: direction });
        assert.equal(result?.status, "available", JSON.stringify(result));
        if (result?.status !== "available") continue;
        assert.equal(source.safeParse(result.value).success, true, JSON.stringify(result));
        assert.equal(target.safeParse(result.value).success, false, JSON.stringify(result));
        assert.deepEqual(JSON.parse(JSON.stringify(result.value)), result.value);
        const frozen = (value: unknown): void => {
          if (value && typeof value === "object") { assert.ok(Object.isFrozen(value)); Object.values(value).forEach(frozen); }
        };
        frozen(result.value);
      }
    }
  }
});

test("bounded composite matrix never returns a false root witness", () => {
  const schemas: Schema<unknown>[] = [object({}), object({ id: number() }), object({ id: optional(number()) }),
    object({ id: nullable(number()) }), object({}, { unknownProperties: "strip" }),
    object({ id: number() }, { unknownProperties: "passthrough" }), array(never()),
    array(number()), array(string(), { minLength: 2 }), union([literal(null), object({ id: string() })])];
  for (const snapshot of [createContractSnapshot, createContractSnapshotV2]) {
    for (const previous of schemas) for (const next of schemas) {
      const results = createContractCounterexamples(snapshot(previous), snapshot(next), { compatibility: "full" });
      assert.deepEqual(results, createContractCounterexamples(snapshot(previous), snapshot(next), { compatibility: "full" }));
      for (const result of results) if (result.status === "available") {
        assert.equal((result.direction === "backward" ? previous : next).safeParse(result.value).success, true);
        assert.equal((result.direction === "backward" ? next : previous).safeParse(result.value).success, false);
      }
    }
  }
});

test("composite construction limits and unsupported recursion remain explicit", () => {
  let deep: Schema<unknown> = string();
  for (let i = 0; i < 5; i++) deep = object({ child: deep });
  for (const source of [deep, object(Object.fromEntries(Array.from({ length: 17 }, (_, index) => [`p${index}`, number()]))),
    array(number(), { minLength: 17 }), union(Array.from({ length: 9 }, (_, index) => literal(index)) as [Schema<unknown>, ...Schema<unknown>[]])]) {
    const [result] = createContractCounterexamples(createContractSnapshot(source), createContractSnapshot(never()));
    assert.equal(result?.status === "unavailable" && result.reason, "construction-limit");
  }
  let recursive: Schema<unknown>;
  recursive = lazy(() => object({ next: optional(recursive) }), { id: "RecursiveWitness" });
  const [result] = createContractCounterexamples(createContractSnapshotV2(recursive), createContractSnapshotV2(never()));
  assert.equal(result?.status === "unavailable" && result.reason, "unsupported-domain");
  let expanded: Schema<unknown> = literal("x");
  for (let i = 0; i < 4; i++) expanded = array(expanded, { minLength: 16, maxLength: 16 });
  const [large] = createContractCounterexamples(createContractSnapshot(expanded), createContractSnapshot(never()));
  assert.equal(large?.status === "unavailable" && large.reason, "construction-limit");
});
