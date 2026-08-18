import assert from "node:assert/strict";
import test from "node:test";
import {
  array,
  discriminatedUnion,
  enum as enumSchema,
  integer,
  intersection,
  lazy,
  literal,
  nullable,
  never as neverSchema,
  number,
  object,
  optional,
  record,
  string,
  tuple,
  union,
  unknown as unknownSchema,
  type Schema,
} from "@safe-shape/core";
import {
  CONTRACT_SNAPSHOT_FORMAT,
  CONTRACT_SNAPSHOT_V2_FORMAT,
  compareContractSnapshots,
  compareContractSnapshotsV2,
  compareContracts,
  compareContractsV2,
  createHttpCompatibilityPresentation,
  createMigrationDiagnostics,
  createContractSnapshot,
  createContractSnapshotV2,
  parseContractSnapshot,
  parseContractSnapshotV2,
} from "../src/index.js";

test("creates deterministic immutable snapshots without metadata examples", () => {
  const first = createContractSnapshot(object({
    z: string(),
    a: string().optional(),
  }).annotate({
    title: "User",
    description: "Public user contract.",
    examples: [{ z: "user_1" }],
  }), { id: "user" });
  const second = createContractSnapshot(object({
    a: string().optional(),
    z: string(),
  }).annotate({
    title: "User",
    description: "Public user contract.",
  }), { id: "user" });

  assert.equal(first.format, CONTRACT_SNAPSHOT_FORMAT);
  assert.match(first.fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.deepEqual(first.contract, second.contract);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.contract), true);
  assert.equal("examples" in (first.contract.metadata ?? {}), false);
});

test("parses valid snapshots and rejects fingerprint tampering", () => {
  const snapshot = createContractSnapshot(literal(undefined), { id: "undefined-value" });
  const parsed = parseContractSnapshot(JSON.parse(JSON.stringify(snapshot)) as unknown);

  assert.deepEqual(parsed, snapshot);
  assert.throws(
    () => parseContractSnapshot({ ...snapshot, fingerprint: "sha256:tampered" }),
    /fingerprint does not match/,
  );
});

test("preserves enum unknown and never nodes in v1 and v2 snapshots", () => {
  const schema = object({
    status: enumSchema(["draft", "published", 1]),
    payload: unknownSchema(),
    impossible: neverSchema().optional(),
  });
  const v1 = createContractSnapshot(schema, { id: "production-primitives" });
  const v2 = createContractSnapshotV2(schema, { id: "production-primitives" });

  assert.deepEqual(parseContractSnapshot(JSON.parse(JSON.stringify(v1))), v1);
  assert.deepEqual(parseContractSnapshotV2(JSON.parse(JSON.stringify(v2))), v2);
  assert.equal(v1.contract.kind, "object");
  if (v1.contract.kind === "object") {
    const status = v1.contract.shape.status;
    assert.deepEqual(status, {
      kind: "enum",
      values: ["draft", "published", 1],
    });
    assert.deepEqual(v1.contract.shape.payload, { kind: "unknown" });
    assert.deepEqual(v1.contract.shape.impossible, {
      kind: "optional",
      inner: { kind: "never" },
    });
    assert.equal(status?.kind === "enum" && Object.isFrozen(status.values), true);
  }
});

test("preserves discriminated unions and intersections in v1 and v2 snapshots", () => {
  const schema = object({
    event: discriminatedUnion("type", [
      object({ type: literal("created"), id: string() }),
      object({ type: literal("deleted"), id: string() }),
    ] as const),
    name: intersection(
      string({ minLength: 2 }),
      string({ maxLength: 100 }),
    ),
  });
  const v1 = createContractSnapshot(schema, { id: "structured-composition" });
  const v2 = createContractSnapshotV2(schema, { id: "structured-composition" });

  assert.deepEqual(parseContractSnapshot(JSON.parse(JSON.stringify(v1))), v1);
  assert.deepEqual(parseContractSnapshotV2(JSON.parse(JSON.stringify(v2))), v2);
  assert.equal(v1.contract.kind, "object");
  if (v1.contract.kind === "object") {
    assert.equal(v1.contract.shape.event?.kind, "discriminatedUnion");
    assert.equal(v1.contract.shape.name?.kind, "intersection");
    assert.equal(Object.isFrozen(v1.contract.shape.event), true);
  }
});

test("treats changed discriminated unions and intersections conservatively", () => {
  const previousUnion = discriminatedUnion("type", [
    object({ type: literal("created"), id: string() }),
    object({ type: literal("deleted"), id: string() }),
  ] as const);
  const nextUnion = discriminatedUnion("type", [
    object({ type: literal("created"), id: string() }),
    object({ type: literal("removed"), id: string() }),
  ] as const);
  const previousIntersection = intersection(string({ minLength: 1 }), string({ maxLength: 10 }));
  const nextIntersection = intersection(string({ minLength: 2 }), string({ maxLength: 10 }));

  assert.equal(compareContracts(previousUnion, previousUnion).status, "safe");
  assert.equal(compareContracts(previousIntersection, previousIntersection).status, "safe");
  const unionReport = compareContracts(previousUnion, nextUnion);
  const intersectionReport = compareContracts(previousIntersection, nextIntersection);
  assert.equal(unionReport.status, "unknown");
  assert.equal(unionReport.findings[0]?.code, "discriminated_union.changed");
  assert.equal(intersectionReport.status, "unknown");
  assert.equal(intersectionReport.findings[0]?.code, "intersection.changed");
});

test("rejects invalid discriminated union snapshot structures", () => {
  const snapshot = createContractSnapshot(discriminatedUnion("type", [
    object({ type: literal("created") }),
  ] as const));
  const emptyChoices = JSON.parse(JSON.stringify(snapshot)) as {
    contract: { choices: unknown[] };
  };
  emptyChoices.contract.choices = [];

  assert.throws(() => parseContractSnapshot(emptyChoices), /choices must be a non-empty array/);
});

test("compares enum sets by directional finite-value containment", () => {
  const previous = enumSchema(["draft", "published"]);
  const next = enumSchema(["draft", "published", "archived"]);
  const backward = compareContracts(previous, next);
  const forward = compareContracts(previous, next, { compatibility: "forward" });
  const full = compareContracts(previous, next, { compatibility: "full" });

  assert.equal(backward.status, "safe");
  assert.equal(backward.findings[0]?.code, "enum.values.changed");
  assert.equal(forward.status, "breaking");
  assert.equal(forward.findings[0]?.code, "enum.values.changed");
  assert.equal(full.status, "breaking");
  assert.deepEqual(full.findings.map((finding) => finding.direction), ["backward", "forward"]);
  assert.equal(compareContracts(previous, previous).status, "safe");
  assert.equal(
    createContractSnapshot(previous).fingerprint,
    createContractSnapshot(enumSchema(["published", "draft"])).fingerprint,
  );
  assert.equal(
    createContractSnapshotV2(previous).fingerprint,
    createContractSnapshotV2(enumSchema(["published", "draft"])).fingerprint,
  );
});

test("compares enum values with literals, primitives, unions, unknown, and never", () => {
  const roles = enumSchema(["admin", "member"]);
  const roleUnion = union([literal("admin"), literal("member")]);

  assert.equal(compareContracts(literal("admin"), roles).status, "safe");
  assert.equal(compareContracts(literal("owner"), roles).status, "breaking");
  assert.equal(compareContracts(enumSchema(["admin"]), literal("admin")).status, "safe");
  assert.equal(compareContracts(roles, literal("admin")).status, "breaking");
  assert.equal(compareContracts(roles, string()).status, "safe");
  assert.equal(compareContracts(enumSchema([1, 2]), number({ minimum: 0 })).status, "safe");
  assert.equal(compareContracts(enumSchema([1, -1]), number({ minimum: 0 })).status, "breaking");
  assert.equal(compareContracts(roles, roleUnion, { compatibility: "full" }).status, "safe");
  assert.equal(compareContracts(roleUnion, roles, { compatibility: "full" }).status, "safe");
  assert.equal(compareContracts(roles, unknownSchema()).status, "safe");
  assert.equal(compareContracts(unknownSchema(), roles).status, "breaking");
  assert.equal(compareContracts(neverSchema(), roles).status, "safe");
  assert.equal(compareContracts(roles, neverSchema()).status, "breaking");
});

test("checks every native constraint before proving literal containment", () => {
  assert.equal(compareContracts(
    literal("admin@example.com"),
    string({ minLength: 5, pattern: "@example\\.com$", format: "email" }),
  ).status, "safe");
  assert.equal(compareContracts(
    literal("not-an-email"),
    string({ format: "email" }),
  ).status, "breaking");
  assert.equal(compareContracts(
    literal("member@example.com"),
    string({ pattern: "^admin@" }),
  ).status, "breaking");
  assert.equal(compareContracts(literal(12.5), number({ multipleOf: 0.5 })).status, "safe");
  assert.equal(compareContracts(literal(12.5), number({ multipleOf: 1 })).status, "breaking");
  assert.equal(
    compareContracts(literal("old"), literal("new")).findings[0]?.code,
    "literal.value.changed",
  );
});

test("preserves string pattern and format constraints in v1 and v2 snapshots", () => {
  const schema = object({
    id: string({ pattern: "^[a-z][a-z0-9_]+$" }),
    email: string({ format: "email" }),
    createdAt: string({ format: "date-time" }),
  });
  const v1 = createContractSnapshot(schema, { id: "formatted-strings" });
  const v2 = createContractSnapshotV2(schema, { id: "formatted-strings" });

  assert.deepEqual(parseContractSnapshot(JSON.parse(JSON.stringify(v1))), v1);
  assert.deepEqual(parseContractSnapshotV2(JSON.parse(JSON.stringify(v2))), v2);
  assert.equal(v1.contract.kind, "object");
  if (v1.contract.kind === "object") {
    assert.deepEqual(v1.contract.shape.id, {
      kind: "string",
      constraints: { pattern: "^[a-z][a-z0-9_]+$" },
    });
    assert.deepEqual(v1.contract.shape.email, {
      kind: "string",
      constraints: { format: "email" },
    });
  }
});

test("compares string pattern and format changes conservatively", () => {
  const stablePattern = string({ minLength: 2, pattern: "^[a-z]+$" });
  const widerLength = string({ minLength: 1, pattern: "^[a-z]+$" });
  const changedPattern = string({ minLength: 2, pattern: "^[a-z0-9]+$" });
  const changedFormat = string({ format: "uuid" });

  assert.equal(compareContracts(stablePattern, widerLength).status, "safe");
  const patternReport = compareContracts(stablePattern, changedPattern);
  assert.equal(patternReport.status, "unknown");
  assert.equal(patternReport.findings[0]?.code, "string.pattern.changed");
  const formatReport = compareContracts(string({ format: "email" }), changedFormat);
  assert.equal(formatReport.status, "unknown");
  assert.equal(formatReport.findings[0]?.code, "string.format.changed");
});

test("preserves multipleOf and record key constraints in v1 and v2 snapshots", () => {
  const schema = object({
    amount: number({ minimum: 0, multipleOf: 0.01 }),
    labels: record(number(), {
      key: { minLength: 2, pattern: "^[a-z]+$" },
    }),
  });
  const v1 = createContractSnapshot(schema, { id: "constrained-numbers-and-records" });
  const v2 = createContractSnapshotV2(schema, { id: "constrained-numbers-and-records" });

  assert.deepEqual(parseContractSnapshot(JSON.parse(JSON.stringify(v1))), v1);
  assert.deepEqual(parseContractSnapshotV2(JSON.parse(JSON.stringify(v2))), v2);
  assert.equal(v1.contract.kind, "object");
  if (v1.contract.kind === "object") {
    assert.deepEqual(v1.contract.shape.amount, {
      kind: "number",
      constraints: { minimum: 0, multipleOf: 0.01 },
    });
    assert.deepEqual(v1.contract.shape.labels, {
      kind: "record",
      value: { kind: "number" },
      key: { minLength: 2, pattern: "^[a-z]+$" },
    });
  }
});

test("preserves object unknown-property policies in v1 and v2 snapshots", () => {
  const schema = object({
    stripped: object({ id: string() }, { unknownProperties: "strip" }),
    open: object({ id: string() }, { unknownProperties: "passthrough" }),
  });
  const v1 = createContractSnapshot(schema, { id: "object-policies" });
  const v2 = createContractSnapshotV2(schema, { id: "object-policies" });

  assert.deepEqual(parseContractSnapshot(JSON.parse(JSON.stringify(v1))), v1);
  assert.deepEqual(parseContractSnapshotV2(JSON.parse(JSON.stringify(v2))), v2);
  assert.equal(v1.contract.kind, "object");
  if (v1.contract.kind === "object") {
    const stripped = v1.contract.shape.stripped;
    const open = v1.contract.shape.open;
    assert.equal(stripped?.kind === "object" && stripped.unknownProperties, "strip");
    assert.equal(open?.kind === "object" && open.unknownProperties, "passthrough");
  }
});

test("compares object unknown-property policies directionally", () => {
  const strict = object({ id: string() });
  const stripped = object({ id: string() }, { unknownProperties: "strip" });
  const open = object({ id: string() }, { unknownProperties: "passthrough" });

  const widening = compareContracts(strict, stripped);
  assert.equal(widening.status, "safe");
  assert.equal(widening.findings[0]?.code, "object.unknown_properties.changed");
  assert.equal(compareContracts(strict, stripped, { compatibility: "forward" }).status, "breaking");
  assert.equal(compareContracts(stripped, strict).status, "breaking");
  assert.equal(compareContracts(stripped, open).status, "breaking");

  const removedIntoPassthrough = compareContracts(
    object({ id: string(), label: string() }, { unknownProperties: "passthrough" }),
    object({ id: string() }, { unknownProperties: "passthrough" }),
  );
  assert.equal(removedIntoPassthrough.status, "safe");
  assert.equal(removedIntoPassthrough.findings[0]?.code, "object.property.removed");
});

test("covers the complete unknown-property policy matrix", () => {
  const schemas = {
    reject: object({ id: string() }, { unknownProperties: "reject" }),
    strip: object({ id: string() }, { unknownProperties: "strip" }),
    passthrough: object({ id: string() }, { unknownProperties: "passthrough" }),
  } as const;
  const expected = {
    reject: { reject: "safe", strip: "safe", passthrough: "safe" },
    strip: { reject: "breaking", strip: "safe", passthrough: "breaking" },
    passthrough: { reject: "breaking", strip: "breaking", passthrough: "safe" },
  } as const;

  for (const source of Object.keys(schemas) as (keyof typeof schemas)[]) {
    for (const target of Object.keys(schemas) as (keyof typeof schemas)[]) {
      assert.equal(
        compareContracts(schemas[source], schemas[target]).status,
        expected[source][target],
        `${source} -> ${target}`,
      );
    }
  }
});

test("proves permissive object property additions and removals when output is preserved", () => {
  const passthrough = object({ id: string() }, { unknownProperties: "passthrough" });
  const optionalUnknown = object(
    { id: string(), label: unknownSchema().optional() },
    { unknownProperties: "passthrough" },
  );
  const optionalString = object(
    { id: string(), label: string().optional() },
    { unknownProperties: "passthrough" },
  );
  const optionalOpaque = object(
    {
      id: string(),
      label: unknownSchema().refine(() => true, { id: "label/v1" }).optional(),
    },
    { unknownProperties: "passthrough" },
  );

  assert.equal(compareContracts(passthrough, optionalUnknown).status, "safe");
  assert.equal(compareContracts(passthrough, optionalString).status, "breaking");
  assert.equal(compareContracts(passthrough, optionalOpaque).status, "unknown");
  assert.equal(compareContracts(
    object({ id: string() }, { unknownProperties: "strip" }),
    object(
      { id: string(), label: unknownSchema().optional() },
      { unknownProperties: "strip" },
    ),
  ).status, "breaking");

  const transformedProperty = object(
    { id: string(), label: string().transform((value) => value.length, { id: "length/v1" }) },
    { unknownProperties: "passthrough" },
  );
  assert.equal(compareContracts(
    transformedProperty,
    object({ id: string() }, { unknownProperties: "passthrough" }),
  ).status, "unknown");
});

test("compares number multiples and record key constraints conservatively", () => {
  assert.equal(
    compareContracts(number({ multipleOf: 2 }), number({ multipleOf: 1 })).status,
    "safe",
  );
  assert.equal(
    compareContracts(number({ multipleOf: 2 }), integer()).status,
    "safe",
  );

  const narrowerMultiple = compareContracts(number({ multipleOf: 1 }), number({ multipleOf: 2 }));
  assert.equal(narrowerMultiple.status, "unknown");
  assert.equal(
    narrowerMultiple.findings.some((finding) => finding.code === "number.multiple_of.changed"),
    true,
  );
  assert.equal(
    compareContracts(
      number({ minimum: 0.1, multipleOf: 0.5 }),
      number({ minimum: 0.5, multipleOf: 0.5 }),
    ).status,
    "unknown",
  );

  assert.equal(
    compareContracts(
      record(string(), { key: { minLength: 2 } }),
      record(string(), { key: { minLength: 1 } }),
    ).status,
    "safe",
  );
  const changedPattern = compareContracts(
    record(string(), { key: { pattern: "^[a-z]+$" } }),
    record(string(), { key: { pattern: "^[a-z0-9]+$" } }),
  );
  assert.equal(changedPattern.status, "unknown");
  assert.deepEqual(changedPattern.findings[0]?.path, ["<key>"]);
  assert.equal(changedPattern.findings[0]?.code, "string.pattern.changed");
});

test("classifies optional property additions by compatibility direction", () => {
  const previous = object({ id: string() });
  const next = object({ id: string(), label: string().optional() });

  const backward = compareContracts(previous, next, { compatibility: "backward" });
  assert.equal(backward.status, "safe");
  assert.equal(backward.compatible, true);
  assert.equal(backward.findings[0]?.code, "object.property.added.optional");

  const forward = compareContracts(previous, next, { compatibility: "forward" });
  assert.equal(forward.status, "breaking");
  assert.equal(forward.compatible, false);

  const full = compareContracts(previous, next, { compatibility: "full" });
  assert.equal(full.status, "breaking");
  assert.deepEqual(full.findings.map((finding) => finding.direction), ["backward", "forward"]);
});

test("reports required additions and strict object removals as breaking", () => {
  const base = object({ id: string() });
  const requiredAddition = object({ id: string(), label: string() });
  const removal = object({});

  assert.equal(compareContracts(base, requiredAddition).status, "breaking");
  assert.equal(compareContracts(base, requiredAddition).findings[0]?.code, "object.property.added.required");
  assert.equal(compareContracts(base, removal).status, "breaking");
  assert.equal(compareContracts(base, removal).findings[0]?.code, "object.property.removed");
});

test("classifies string length widening and narrowing by direction", () => {
  const previous = string({ minLength: 2, maxLength: 10 });
  const next = string({ minLength: 1, maxLength: 20 });

  const backward = compareContracts(previous, next);
  assert.equal(backward.status, "safe");
  assert.equal(backward.findings[0]?.code, "string.length.changed");

  const forward = compareContracts(previous, next, { compatibility: "forward" });
  assert.equal(forward.status, "breaking");
  assert.equal(forward.findings[0]?.code, "string.length.changed");
});

test("classifies numeric ranges and integer requirements", () => {
  const integers = integer({ minimum: 0, maximum: 10 });
  const numbers = number({ minimum: 0, maximum: 10 });

  assert.equal(compareContracts(integers, numbers).status, "safe");
  assert.equal(compareContracts(integers, numbers, { compatibility: "forward" }).status, "breaking");
  assert.equal(compareContracts(
    number({ minimum: 1, maximum: 1 }),
    integer({ minimum: 0, maximum: 2 }),
  ).status, "safe");
  assert.equal(compareContracts(
    number({ minimum: 0, maximum: 10 }),
    number({ minimum: 1, maximum: 9 }),
  ).status, "breaking");
});

test("combines array length and item compatibility", () => {
  const previous = array(string({ minLength: 2 }), { minLength: 1, maxLength: 5 });
  const next = array(string({ minLength: 1 }), { maxLength: 10 });
  const report = compareContracts(previous, next);

  assert.equal(report.status, "safe");
  assert.deepEqual(report.findings.map((finding) => finding.code), [
    "array.length.changed",
    "string.length.changed",
  ]);

  assert.equal(compareContracts(previous, next, { compatibility: "forward" }).status, "breaking");
  assert.equal(compareContracts(
    array(string(), { maxLength: 0 }),
    array(neverSchema()),
    { compatibility: "full" },
  ).status, "safe");
  const emptyTarget = compareContracts(
    array(string(), { maxLength: 0 }),
    array(neverSchema(), { minLength: 1 }),
  );
  assert.equal(emptyTarget.status, "breaking");
  assert.equal(emptyTarget.findings[0]?.code, "contract.target.empty");
});

test("compares tuples and exact-length arrays in both directions", () => {
  const pair = tuple([string(), string()]);
  const exactPairArray = array(string(), { minLength: 2, maxLength: 2 });

  assert.equal(compareContracts(pair, exactPairArray, { compatibility: "full" }).status, "safe");
  assert.equal(compareContracts(exactPairArray, pair, { compatibility: "full" }).status, "safe");
  assert.equal(compareContracts(
    tuple([string(), number()]),
    array(union([string(), number()]), { minLength: 2, maxLength: 2 }),
  ).status, "safe");

  const lengthFailure = compareContracts(
    pair,
    array(string(), { minLength: 3 }),
  );
  assert.equal(lengthFailure.status, "breaking");
  assert.equal(lengthFailure.findings[0]?.code, "tuple.array.changed");

  assert.equal(compareContracts(array(string()), pair).status, "breaking");
  assert.equal(compareContracts(
    array(string(), { minLength: 2, maxLength: 2 }),
    tuple([string({ minLength: 1 }), string()]),
  ).status, "breaking");
  assert.equal(compareContracts(
    array(neverSchema(), { minLength: 1 }),
    tuple([string()]),
  ).status, "safe");
  assert.equal(compareContracts(array(neverSchema()), tuple([])).status, "safe");
  assert.equal(compareContracts(tuple([string()]), tuple([string(), string()])).status, "breaking");
  assert.equal(compareContracts(tuple([neverSchema()]), tuple([])).status, "safe");
  assert.equal(compareContracts(
    tuple([string({ pattern: "(?!)" })]),
    tuple([string(), string()]),
  ).status, "unknown");
});

test("uses witnesses for disjoint union branches and stays conservative for collective coverage", () => {
  const disjoint = compareContracts(
    union([string(), number()]),
    union([string(), object({ id: string() })]),
  );
  assert.equal(disjoint.status, "breaking");
  assert.equal(disjoint.findings[0]?.code, "union.choices.changed");

  const collective = compareContracts(
    string(),
    union([string({ maxLength: 1 }), string({ minLength: 2 })]),
  );
  assert.equal(collective.status, "unknown");
});

test("snapshot parsing validates native constraints", () => {
  const snapshot = createContractSnapshot(string({ minLength: 1 }), { id: "name" });
  const tampered = JSON.parse(JSON.stringify(snapshot)) as {
    contract: { constraints: { minLength: number } };
  };
  tampered.contract.constraints.minLength = -1;

  assert.throws(() => parseContractSnapshot(tampered), /non-negative safe integer/);

  const enumSnapshot = createContractSnapshot(enumSchema(["draft", "published"]));
  const duplicateEnum = JSON.parse(JSON.stringify(enumSnapshot)) as {
    contract: { values: string[] };
  };
  duplicateEnum.contract.values = ["draft", "draft"];
  assert.throws(() => parseContractSnapshot(duplicateEnum), /must contain unique values/);

  const formatted = createContractSnapshot(string({ format: "email" }));
  const invalidFormat = JSON.parse(JSON.stringify(formatted)) as {
    contract: { constraints: { format: string; pattern?: string } };
  };
  invalidFormat.contract.constraints.format = "uri";
  assert.throws(() => parseContractSnapshot(invalidFormat), /must be "email"/);

  const invalidPattern = JSON.parse(JSON.stringify(formatted)) as {
    contract: { constraints: { format: string; pattern?: string } };
  };
  invalidPattern.contract.constraints.pattern = "[";
  assert.throws(() => parseContractSnapshot(invalidPattern), /valid ECMAScript regular expression/);

  const multiple = createContractSnapshot(number({ multipleOf: 0.1 }));
  const invalidMultiple = JSON.parse(JSON.stringify(multiple)) as {
    contract: { constraints: { multipleOf: number } };
  };
  invalidMultiple.contract.constraints.multipleOf = 0;
  assert.throws(() => parseContractSnapshot(invalidMultiple), /positive finite number/);

  const constrainedRecord = createContractSnapshot(record(string(), {
    key: { pattern: "^[a-z]+$" },
  }));
  const invalidRecordKey = JSON.parse(JSON.stringify(constrainedRecord)) as {
    contract: { key: { pattern: string } };
  };
  invalidRecordKey.contract.key.pattern = "[";
  assert.throws(() => parseContractSnapshot(invalidRecordKey), /valid ECMAScript regular expression/);

  const objectSnapshot = createContractSnapshot(object({ id: string() }));
  const invalidObjectPolicy = JSON.parse(JSON.stringify(objectSnapshot)) as {
    contract: { unknownProperties: string };
  };
  invalidObjectPolicy.contract.unknownProperties = "ignore";
  assert.throws(() => parseContractSnapshot(invalidObjectPolicy), /must be "reject", "strip", or "passthrough"/);
});

test("proves literal and union widening only in the safe direction", () => {
  assert.equal(compareContracts(literal("admin"), string()).status, "safe");
  assert.equal(compareContracts(literal("a"), string({ minLength: 2 })).status, "breaking");
  assert.equal(compareContracts(literal(1.5), integer()).status, "breaking");
  assert.equal(compareContracts(literal(2), integer({ minimum: 1, maximum: 3 })).status, "safe");
  assert.equal(compareContracts(literal("admin"), string(), { compatibility: "forward" }).status, "breaking");

  const previous = union([literal("admin"), literal("member")]);
  const next = union([literal("admin"), literal("member"), literal("owner")]);

  assert.equal(compareContracts(previous, next).status, "safe");
  assert.equal(compareContracts(previous, next, { compatibility: "forward" }).status, "breaking");

  const collectivelyCovered = compareContracts(
    string(),
    union([string({ maxLength: 1 }), string({ minLength: 2 })]),
  );
  assert.equal(collectivelyCovered.status, "unknown");
  assert.equal(collectivelyCovered.findings[0]?.code, "union.choices.changed");
});

test("handles nullable and optional widening without losing inner compatibility", () => {
  assert.equal(compareContracts(nullable(literal("admin")), nullable(string())).status, "safe");
  assert.equal(compareContracts(literal(undefined), optional(string())).status, "safe");
  assert.equal(compareContracts(
    nullable(string()),
    union([string(), literal(null)]),
    { compatibility: "full" },
  ).status, "safe");
  assert.equal(compareContracts(
    optional(string()),
    union([string(), literal(undefined)]),
    { compatibility: "full" },
  ).status, "safe");
  assert.equal(compareContracts(nullable(string()), string()).status, "breaking");
});

test("uses unknown for unimplemented cross-kind relationships", () => {
  assert.equal(compareContracts(object({ id: string() }), record(string())).status, "unknown");
  assert.equal(compareContracts(string(), object({ value: string() })).status, "unknown");
  assert.equal(compareContracts(string(), literal("only")).status, "breaking");
});

test("treats annotation changes separately from runtime compatibility", () => {
  const previous = string().annotate({ title: "Old title" });
  const next = string().annotate({ title: "New title" });
  const report = compareContracts(previous, next);

  assert.equal(report.status, "annotation-only");
  assert.equal(report.compatible, true);
  assert.equal(report.findings[0]?.code, "contract.annotation.changed");
});

test("blocks anonymous opaque behavior and accepts stable matching ids", () => {
  const anonymous = string().refine((value) => value.length > 0);
  const anonymousReport = compareContracts(anonymous, anonymous);
  assert.equal(anonymousReport.status, "unknown");
  assert.equal(anonymousReport.findings[0]?.code, "opaque.refinement.anonymous");

  const namedPrevious = string().refine((value) => value.length > 0, { id: "non-empty/v1" });
  const namedNext = string().refine((value) => value.length > 1, { id: "non-empty/v1" });
  assert.equal(compareContracts(namedPrevious, namedNext).status, "safe");

  const changedId = string().refine((value) => value.length > 1, { id: "non-empty/v2" });
  assert.equal(compareContracts(namedPrevious, changedId).status, "unknown");

  const anonymousTransform = string().transform((value) => value.length);
  assert.equal(compareContracts(anonymousTransform, anonymousTransform).status, "unknown");

  const namedTransform = string().transform((value) => value.length, { id: "string-length/v1" });
  assert.equal(compareContracts(namedTransform, namedTransform).status, "safe");

  const diagnosticPrevious = object({ start: number(), end: number() }).refineWithIssues(
    (value, context) => {
      if (value.start > value.end) context.addIssue({ path: ["end"], message: "Invalid range." });
    },
    { id: "ordered-range/v1" },
  );
  const diagnosticSameId = object({ start: number(), end: number() }).refineWithIssues(
    (value, context) => {
      if (value.start >= value.end) context.addIssue({ path: ["end"], message: "Invalid range." });
    },
    { id: "ordered-range/v1" },
  );
  const diagnosticChangedId = object({ start: number(), end: number() }).refineWithIssues(
    () => undefined,
    { id: "ordered-range/v2" },
  );
  assert.equal(compareContracts(diagnosticPrevious, diagnosticSameId).status, "safe");
  assert.equal(compareContracts(diagnosticPrevious, diagnosticChangedId).status, "unknown");
});

test("reports mismatched contract ids as unknown", () => {
  const previous = createContractSnapshot(string(), { id: "user" });
  const next = createContractSnapshot(string(), { id: "account" });
  const report = compareContractSnapshots(previous, next);

  assert.equal(report.status, "unknown");
  assert.equal(report.findings[0]?.code, "contract.id.changed");
});

test("presents backward request compatibility as a server consumer concern", () => {
  const report = compareContracts(string(), string({ minLength: 2 }));
  const presentation = createHttpCompatibilityPresentation(report, { exchange: "request" });

  assert.equal(presentation.exchange, "request");
  assert.equal(presentation.producer, "client");
  assert.equal(presentation.consumer, "server");
  assert.equal(presentation.focus, "consumer");
  assert.equal(presentation.status, "breaking");
  assert.equal(presentation.summary, "HTTP request consumer compatibility for the server is breaking.");
  assert.equal(presentation.findings[0]?.party, "server");
  assert.equal(presentation.findings[0]?.role, "consumer");
  assert.equal(presentation.findings[0]?.finding, report.findings[0]);
  assert.equal(Object.isFrozen(presentation), true);
  assert.equal(Object.isFrozen(presentation.findings), true);
  assert.equal(Object.isFrozen(presentation.findings[0]), true);
});

test("presents forward response compatibility as a server producer concern", () => {
  const report = compareContracts(string({ minLength: 2 }), string(), {
    compatibility: "forward",
  });
  const presentation = createHttpCompatibilityPresentation(report, { exchange: "response" });

  assert.equal(presentation.producer, "server");
  assert.equal(presentation.consumer, "client");
  assert.equal(presentation.focus, "producer");
  assert.equal(presentation.summary, "HTTP response producer compatibility for the server is breaking.");
  assert.equal(presentation.findings[0]?.party, "server");
  assert.equal(presentation.findings[0]?.role, "producer");
});

test("presents full and graph HTTP compatibility without changing proof data", () => {
  const fullReport = compareContracts(string(), string({ minLength: 2 }), {
    compatibility: "full",
  });
  const fullPresentation = createHttpCompatibilityPresentation(fullReport, { exchange: "request" });

  assert.equal(fullPresentation.focus, "producer-and-consumer");
  assert.equal(fullPresentation.summary, "HTTP request producer and consumer compatibility is breaking.");
  assert.deepEqual(fullPresentation.findings.map(({ party, role }) => [party, role]), [
    ["server", "consumer"],
    ["client", "producer"],
  ]);

  const graphReport = compareContractsV2(string(), string(), { side: "output" });
  const graphPresentation = createHttpCompatibilityPresentation(graphReport, { exchange: "response" });
  assert.equal(graphPresentation.side, "output");
  assert.equal(graphPresentation.previousFingerprint, graphReport.previousFingerprint);
  assert.equal(graphPresentation.nextFingerprint, graphReport.nextFingerprint);
  assert.throws(
    () => createHttpCompatibilityPresentation(graphReport, { exchange: "stream" as "request" }),
    /Unsupported HTTP compatibility exchange/,
  );
});

test("creates actionable migration diagnostics for breaking reports", () => {
  const report = compareContracts(
    object({ id: string() }),
    object({ id: string(), organizationId: string() }),
  );
  const migration = createMigrationDiagnostics(report);

  assert.equal(migration.decision, "migration-required");
  assert.equal(migration.migrationRequired, true);
  assert.equal(migration.manualReviewRequired, false);
  assert.equal(migration.counts.breaking, 1);
  assert.equal(migration.summary, "Contract migration is required for 1 breaking finding.");
  assert.deepEqual(migration.diagnostics[0]?.path, ["organizationId"]);
  assert.equal(migration.diagnostics[0]?.code, "object.property.added.required");
  assert.equal(typeof migration.diagnostics[0]?.suggestion, "string");
  assert.equal(Object.isFrozen(migration), true);
  assert.equal(Object.isFrozen(migration.counts), true);
  assert.equal(Object.isFrozen(migration.diagnostics), true);
  assert.equal(Object.isFrozen(migration.diagnostics[0]?.path), true);
});

test("distinguishes compatible, annotation-only, and manual-review migrations", () => {
  assert.deepEqual(createMigrationDiagnostics(compareContracts(string(), string())), {
    decision: "compatible",
    migrationRequired: false,
    manualReviewRequired: false,
    counts: { safe: 0, breaking: 0, risky: 0, unknown: 0, annotationOnly: 0 },
    summary: "No contract migration is required.",
    diagnostics: [],
  });

  const annotations = createMigrationDiagnostics(compareContracts(
    string().annotate({ title: "Previous" }),
    string().annotate({ title: "Next" }),
  ));
  assert.equal(annotations.decision, "compatible");
  assert.equal(annotations.counts.annotationOnly, 1);
  assert.equal(annotations.summary, "No contract migration is required; only annotations changed.");

  const manualReview = createMigrationDiagnostics(compareContracts(
    string().transform((value) => value),
    string().transform((value) => value),
  ));
  assert.equal(manualReview.decision, "manual-review");
  assert.equal(manualReview.manualReviewRequired, true);
  assert.equal(manualReview.counts.unknown, 1);
  assert.equal(manualReview.diagnostics[0]?.status, "unknown");
});

test("snapshot v1 rejects recursive references explicitly", () => {
  interface TreeNode {
    readonly children: readonly TreeNode[];
  }

  let treeSchema: Schema<TreeNode>;
  treeSchema = lazy(
    () => object({ children: array(treeSchema) }),
    { id: "TreeNode" },
  );

  assert.throws(
    () => createContractSnapshot(treeSchema, { id: "tree" }),
    /snapshot v1 cannot represent schema references/,
  );
});

test("creates deterministic v2 snapshots for recursive input and output graphs", () => {
  interface TreeNode {
    readonly label: string;
    readonly children: readonly TreeNode[];
  }

  const createTree = (reverse: boolean): Schema<TreeNode> => {
    let treeSchema: Schema<TreeNode>;
    treeSchema = lazy(
      () => reverse
        ? object({ children: array(treeSchema), label: string() })
        : object({ label: string(), children: array(treeSchema) }),
      { id: "TreeNode" },
    );
    return treeSchema;
  };

  const first = createContractSnapshotV2(createTree(false), { id: "tree" });
  const second = createContractSnapshotV2(createTree(true), { id: "tree" });

  assert.equal(first.format, CONTRACT_SNAPSHOT_V2_FORMAT);
  assert.match(first.fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.match(first.input.fingerprint, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first.input.fingerprint, first.output.fingerprint);
  assert.equal(first.fingerprint, second.fingerprint);
  assert.equal(JSON.stringify(first), JSON.stringify(second));
  assert.deepEqual(first.input.root, { kind: "reference", id: "TreeNode" });
  assert.equal(Object.isFrozen(first), true);
  assert.equal(Object.isFrozen(first.input), true);
  assert.equal(Object.isFrozen(first.input.definitions), true);
  assert.equal(Object.isFrozen(first.input.definitions.TreeNode), true);
});

test("compares recursive v2 contracts across renamed references", () => {
  interface TreeNode {
    readonly label: string;
    readonly children: readonly TreeNode[];
  }

  const createTree = (referenceId: string, minLength?: number): Schema<TreeNode> => {
    let treeSchema: Schema<TreeNode>;
    treeSchema = lazy(
      () => object({
        label: string(minLength === undefined ? {} : { minLength }),
        children: array(treeSchema),
      }),
      { id: referenceId },
    );
    return treeSchema;
  };

  const previous = createTree("PreviousTree");
  const renamed = createTree("NextTree");
  const narrowed = createTree("NextTree", 2);

  const renamedReport = compareContractsV2(previous, renamed, {
    compatibility: "full",
    id: "tree",
  });
  assert.equal(renamedReport.status, "safe");
  assert.equal(renamedReport.side, "input");

  const narrowedReport = compareContractsV2(previous, narrowed, { id: "tree" });
  assert.equal(narrowedReport.status, "breaking");
  assert.equal(narrowedReport.findings.some((finding) =>
    finding.code === "string.length.changed" &&
    JSON.stringify(finding.path) === JSON.stringify(["label"])), true);
  assert.equal(compareContractsV2(previous, narrowed, {
    compatibility: "forward",
    id: "tree",
  }).status, "safe");
});

test("compares reusable definitions independently of sharing topology", () => {
  const shared = lazy(() => string(), { id: "SharedValue" });
  const previous = object({ left: shared, right: shared });
  const next = object({
    left: lazy(() => string(), { id: "LeftValue" }),
    right: lazy(() => string(), { id: "RightValue" }),
  });

  assert.equal(compareContractsV2(previous, next, {
    compatibility: "full",
    id: "pair",
  }).status, "safe");
});

test("reports recursive graph annotation changes separately", () => {
  interface Node {
    readonly children: readonly Node[];
  }

  const createNode = (title: string): Schema<Node> => {
    let nodeSchema: Schema<Node>;
    nodeSchema = lazy(
      () => object({ children: array(nodeSchema) }).annotate({ title }),
      { id: "Node" },
    );
    return nodeSchema;
  };

  const report = compareContractsV2(createNode("Previous"), createNode("Next"), {
    compatibility: "full",
    id: "node",
  });

  assert.equal(report.status, "annotation-only");
  assert.equal(report.compatible, true);
  assert.equal(report.findings.every((finding) => finding.code === "contract.annotation.changed"), true);
});

test("treats identical finite v2 contract graphs as safe", () => {
  const schema = object({
    role: union([literal("admin"), literal("member")]),
  });
  const snapshot = createContractSnapshotV2(schema, { id: "user" });

  const report = compareContractSnapshotsV2(snapshot, snapshot, {
    compatibility: "full",
  });

  assert.equal(report.status, "safe");
  assert.equal(report.compatible, true);
  assert.deepEqual(report.findings, []);
});

test("compares stored v2 snapshots and reports recursive object changes", () => {
  interface Node {
    readonly next?: Node;
  }

  const createNode = (withRequiredValue: boolean): Schema<Node & { readonly value?: string }> => {
    let nodeSchema: Schema<Node & { readonly value?: string }>;
    nodeSchema = lazy(
      () => withRequiredValue
        ? object({ next: optional(nodeSchema), value: string() })
        : object({ next: optional(nodeSchema) }),
      { id: "Node" },
    );
    return nodeSchema;
  };

  const previous = createContractSnapshotV2(createNode(false), { id: "node" });
  const next = createContractSnapshotV2(createNode(true), { id: "node" });
  const report = compareContractSnapshotsV2(previous, next);

  assert.equal(report.status, "breaking");
  assert.equal(report.previousFingerprint, previous.input.fingerprint);
  assert.equal(report.nextFingerprint, next.input.fingerprint);
  assert.equal(report.findings.some((finding) =>
    finding.code === "object.property.added.required" &&
    JSON.stringify(finding.path) === JSON.stringify(["value"])), true);
});

test("selects transform input and output graph compatibility explicitly", () => {
  const previous = string().transform((value) => value.length, { id: "length/v1" });
  const narrowedInput = string({ minLength: 2 }).transform((value) => value.length, { id: "length/v1" });
  const changedOutput = string().transform((value) => value.length, { id: "length/v2" });
  const anonymousOutput = string().transform((value) => value.length);

  assert.equal(compareContractsV2(previous, narrowedInput, {
    side: "input",
    id: "length",
  }).status, "breaking");
  assert.equal(compareContractsV2(previous, narrowedInput, {
    side: "output",
    id: "length",
  }).status, "safe");
  assert.equal(compareContractsV2(previous, changedOutput, {
    side: "output",
    id: "length",
  }).status, "unknown");
  assert.equal(compareContractsV2(anonymousOutput, anonymousOutput, {
    side: "output",
    id: "length",
  }).status, "unknown");
});

test("fingerprints transform input and opaque output independently", () => {
  const snapshot = createContractSnapshotV2(
    string().transform((value) => value.length, { id: "string-length/v1" }),
    { id: "length" },
  );

  assert.notEqual(snapshot.input.fingerprint, snapshot.output.fingerprint);
  assert.deepEqual(snapshot.input.root, {
    kind: "transform",
    inner: { kind: "string" },
    id: "string-length/v1",
  });
  assert.deepEqual(snapshot.output.root, {
    kind: "opaque",
    behavior: "transform",
    id: "string-length/v1",
  });
});

test("parses v2 snapshots and verifies graph and aggregate fingerprints", () => {
  interface Node {
    readonly next?: Node;
  }

  let nodeSchema: Schema<Node>;
  nodeSchema = lazy(() => object({ next: optional(nodeSchema) }), { id: "Node" });
  const snapshot = createContractSnapshotV2(nodeSchema, { id: "node" });
  const serialized = JSON.parse(JSON.stringify(snapshot)) as unknown;

  assert.deepEqual(parseContractSnapshotV2(serialized), snapshot);

  const tamperedSide = JSON.parse(JSON.stringify(snapshot)) as {
    input: { fingerprint: string };
  };
  tamperedSide.input.fingerprint = "sha256:tampered";
  assert.throws(
    () => parseContractSnapshotV2(tamperedSide),
    /snapshot\.input\.fingerprint does not match/,
  );

  const tamperedAggregate = JSON.parse(JSON.stringify(snapshot)) as {
    fingerprint: string;
  };
  tamperedAggregate.fingerprint = "sha256:tampered";
  assert.throws(
    () => parseContractSnapshotV2(tamperedAggregate),
    /snapshot v2 fingerprint does not match/,
  );
});

test("rejects dangling references and unreachable v2 definitions", () => {
  const snapshot = createContractSnapshotV2(lazy(() => string(), { id: "Value" }));
  const dangling = JSON.parse(JSON.stringify(snapshot)) as {
    input: { root: { id: string } };
  };
  dangling.input.root.id = "Missing";
  assert.throws(
    () => parseContractSnapshotV2(dangling),
    /references missing definition "Missing"/,
  );

  const unreachable = JSON.parse(JSON.stringify(snapshot)) as {
    input: {
      definitions: Record<string, unknown>;
      fingerprint: string;
    };
  };
  unreachable.input.definitions.Unused = { kind: "string" };
  assert.throws(
    () => parseContractSnapshotV2(unreachable),
    /definitions\.Unused is not reachable/,
  );
});
