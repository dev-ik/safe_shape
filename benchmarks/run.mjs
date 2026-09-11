#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { runCase } from "./runner.mjs";
import { fileURLToPath } from "node:url";

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reportPath = resolve(rootDir, ".tmp", "benchmarks", "report.json");
const rootPackage = JSON.parse(await readFile(resolve(rootDir, "package.json"), "utf8"));
const core = await import(resolve(rootDir, "packages", "core", "dist", "index.js"));
const compat = await import(resolve(rootDir, "packages", "compat", "dist", "index.js"));

const {
  array,
  boolean,
  discriminatedUnion,
  intersection,
  groupIssuesByPath,
  lazy,
  literal,
  nullable,
  number,
  object,
  record,
  string,
  tuple,
  toFieldErrors,
  union,
} = core;
const { compareContracts, compareContractsV2 } = compat;

const stringSchema = string();
const passingWarningSchema = string().warn(() => true, {
  id: "benchmark.warning-pass/v1",
});
const emittedWarningSchema = string().warn(() => false, {
  id: "benchmark.warning-emit/v1",
  message: "Benchmark warning.",
  params: { recommended: true },
});
const emailSchema = string({ format: "email" });
const decimalAmountSchema = number({ minimum: 0, multipleOf: 0.01 });
const constrainedRecordSchema = record(boolean(), {
  key: { pattern: "^[a-z][a-zA-Z0-9]*$" },
});
const stripObjectSchema = object(
  { id: string(), active: boolean() },
  { unknownProperties: "strip" },
);
const passthroughObjectSchema = object(
  { id: string(), active: boolean() },
  { unknownProperties: "passthrough" },
);
const userSchema = object({
  id: string(),
  name: string(),
  age: number().optional(),
  active: boolean(),
  tags: array(string()),
  profile: nullable(object({
    country: string(),
    point: tuple([number(), number()]),
  })),
  flags: record(boolean()),
});
const eventSchema = union([
  object({ type: literal("created"), id: string() }),
  object({ type: literal("deleted"), id: string(), reason: string().optional() }),
  object({ type: literal("moved"), id: string(), point: tuple([number(), number()]) }),
]);
const discriminatedEventSchema = discriminatedUnion("type", [
  object({ type: literal("created"), id: string() }),
  object({ type: literal("deleted"), id: string(), reason: string().optional() }),
  object({ type: literal("moved"), id: string(), point: tuple([number(), number()]) }),
]);
const boundedStringSchema = intersection(
  string({ minLength: 1 }),
  string({ maxLength: 100 }),
);
const usersSchema = array(userSchema);
const standardUserSchema = userSchema["~standard"];
let treeSchema;
treeSchema = lazy(
  () => object({
    children: array(treeSchema),
    name: string(),
  }),
  { id: "BenchmarkTreeNode" },
);
const compatibilityPreviousSchema = object({
  id: string({ minLength: 2 }),
  name: string().optional(),
});
const compatibilityWidenedSchema = object({
  id: string({ minLength: 1 }),
  name: string().optional(),
});
const compatibilityNarrowedSchema = object({
  id: string({ minLength: 3 }),
  name: string().optional(),
});
const recursiveCompatibilityPreviousSchema = createRecursiveCompatibilitySchema(2);
const recursiveCompatibilityNextSchema = createRecursiveCompatibilitySchema(1);
const issueListResult = array(string()).safeParse(
  Object.freeze(Array.from({ length: 200 }, (_, index) => index)),
);
if (issueListResult.success) throw new Error("Benchmark issue fixture must be invalid.");
const largeIssueList = issueListResult.error.issues;

const validUser = Object.freeze({
  id: "user_1",
  name: "Ada",
  age: 37,
  active: true,
  tags: Object.freeze(["admin", "beta", "reader"]),
  profile: Object.freeze({ country: "UK", point: Object.freeze([10, 20]) }),
  flags: Object.freeze({ darkMode: true, emails: false }),
});
const validUsers = Object.freeze(Array.from({ length: 25 }, (_, index) => ({
  ...validUser,
  id: `user_${index}`,
})));
const validEvent = Object.freeze({ type: "moved", id: "event_1", point: Object.freeze([5, 9]) });
const invalidEvent = Object.freeze({ type: "unknown", id: 42, point: Object.freeze(["x"]) });
const invalidUser = Object.freeze({ ...validUser, active: "yes" });
const validTree = Object.freeze({
  name: "root",
  children: Object.freeze([
    Object.freeze({
      name: "branch",
      children: Object.freeze([
        Object.freeze({ name: "leaf", children: Object.freeze([]) }),
      ]),
    }),
  ]),
});

const migrationReport = compareContracts(compatibilityPreviousSchema, compatibilityNarrowedSchema);
const counterexamplePrevious = compat.createContractSnapshotV2(number({ minimum: 0 }));
const counterexampleNext = compat.createContractSnapshotV2(number({ minimum: 1 }));
const stringCounterexamplePrevious = compat.createContractSnapshotV2(string({ minLength: 2 }));
const stringCounterexampleNext = compat.createContractSnapshotV2(string({ minLength: 3 }));
const compositeCounterexamplePrevious = compat.createContractSnapshotV2(object({ user: object({ name: string({ minLength: 2 }) }), events: array(number(), { minLength: 1 }) }));
const compositeCounterexampleNext = compat.createContractSnapshotV2(object({ user: object({ name: string({ minLength: 3 }) }), events: array(number(), { minLength: 1 }) }));
const cases = [
  {
    name: "contract composite counterexample",
    iterations: 1_000,
    run: () => compat.createContractCounterexamples(compositeCounterexamplePrevious, compositeCounterexampleNext),
    accept: (result) => result[0].status === "available" && result[0].value.user.name === "aa" && result[0].value.events.length === 1,
  },
  {
    name: "contract string counterexample",
    iterations: 10_000,
    run: () => compat.createContractCounterexamples(stringCounterexamplePrevious, stringCounterexampleNext),
    accept: (result) => result[0].status === "available" && result[0].value === "aa",
  },
  {
    name: "contract scalar counterexample",
    iterations: 10_000,
    run: () => compat.createContractCounterexamples(counterexamplePrevious, counterexampleNext),
    accept: (result) => result[0].status === "available" && result[0].value === 0,
  },
  {
    name: "recursive contract v2 snapshot creation",
    iterations: 10_000,
    run: () => compat.createContractSnapshotV2(recursiveCompatibilityPreviousSchema, { id: "benchmark-tree" }),
    accept: (result) => result.format === "safe-shape.contract/v2",
  },
  {
    name: "contract migration projection breaking",
    iterations: 20_000,
    run: () => compat.createMigrationDiagnostics(migrationReport),
    accept: (result) => result.decision === "migration-required",
  },
  {
    name: "primitive string safeParse valid",
    iterations: 500_000,
    run: () => stringSchema.safeParse("safe-shape"),
  },
  {
    name: "passing warning rule safeParse valid",
    iterations: 250_000,
    run: () => passingWarningSchema.safeParse("safe-shape"),
  },
  {
    name: "emitted structured warning safeParse valid",
    iterations: 100_000,
    run: () => emittedWarningSchema.safeParse("safe-shape"),
  },
  {
    name: "formatted email string safeParse valid",
    iterations: 100_000,
    run: () => emailSchema.safeParse("benchmark@example.com"),
  },
  {
    name: "decimal multipleOf safeParse valid",
    iterations: 100_000,
    run: () => decimalAmountSchema.safeParse(1234.56),
  },
  {
    name: "constrained record safeParse valid",
    iterations: 100_000,
    run: () => constrainedRecordSchema.safeParse(validUser.flags),
  },
  {
    name: "strip object safeParse valid",
    iterations: 100_000,
    run: () => stripObjectSchema.safeParse(validUser),
  },
  {
    name: "passthrough object safeParse valid",
    iterations: 100_000,
    run: () => passthroughObjectSchema.safeParse(validUser),
  },
  {
    name: "object user safeParse valid",
    iterations: 100_000,
    run: () => userSchema.safeParse(validUser),
  },
  {
    name: "Standard Schema user validate valid",
    iterations: 100_000,
    run: () => standardUserSchema.validate(validUser),
    accept: (result) => result.issues === undefined && result.value?.id === validUser.id,
  },
  {
    name: "union event safeParse valid",
    iterations: 100_000,
    run: () => eventSchema.safeParse(validEvent),
  },
  {
    name: "union event safeParse invalid with branch diagnostics",
    expectedSuccess: false,
    iterations: 50_000,
    run: () => eventSchema.safeParse(invalidEvent),
  },
  {
    name: "discriminated union event safeParse valid",
    iterations: 100_000,
    run: () => discriminatedEventSchema.safeParse(validEvent),
  },
  {
    name: "intersection string safeParse valid",
    iterations: 100_000,
    run: () => boundedStringSchema.safeParse("safe-shape"),
  },
  {
    name: "array users safeParse valid",
    iterations: 20_000,
    run: () => usersSchema.safeParse(validUsers),
  },
  {
    name: "object user safeParse invalid",
    expectedSuccess: false,
    iterations: 100_000,
    run: () => userSchema.safeParse(invalidUser),
  },
  {
    name: "group 200 issues by path",
    iterations: 10_000,
    run: () => groupIssuesByPath(largeIssueList),
    accept: (result) => result.length === 200,
  },
  {
    name: "project 200 issues to field errors",
    iterations: 10_000,
    run: () => toFieldErrors(largeIssueList),
    accept: (result) => Object.keys(result).length === 200,
  },
  {
    name: "recursive tree safeParse valid",
    iterations: 100_000,
    run: () => treeSchema.safeParse(validTree),
  },
  {
    name: "contract compatibility widening safe",
    iterations: 20_000,
    run: () => compareContracts(
      compatibilityPreviousSchema,
      compatibilityWidenedSchema,
      { id: "benchmark-user", compatibility: "backward" },
    ),
    accept: (result) => result.status === "safe",
  },
  {
    name: "contract compatibility narrowing breaking",
    iterations: 20_000,
    run: () => compareContracts(
      compatibilityPreviousSchema,
      compatibilityNarrowedSchema,
      { id: "benchmark-user", compatibility: "backward" },
    ),
    accept: (result) => result.status === "breaking",
  },
  {
    name: "recursive contract v2 compatibility widening safe",
    iterations: 10_000,
    run: () => compareContractsV2(
      recursiveCompatibilityPreviousSchema,
      recursiveCompatibilityNextSchema,
      { id: "benchmark-tree", side: "input", compatibility: "backward" },
    ),
    accept: (result) => result.status === "safe",
  },
];

const results = [];
for (const benchmarkCase of cases) {
  const result = runCase(benchmarkCase);
  if (["contract scalar counterexample", "contract string counterexample", "contract composite counterexample"].includes(benchmarkCase.name) && result.duration_ms > 5000) {
    throw new Error(`${benchmarkCase.name} budget exceeded: ${benchmarkCase.iterations} calls must complete within 5 seconds.`);
  }
  results.push(result);
}

const report = Object.freeze({
  name: "safe-shape-benchmarks",
  version: rootPackage.version,
  generated_at: new Date().toISOString(),
  runtime: Object.freeze({
    node: process.version,
    platform: process.platform,
    arch: process.arch,
  }),
  results: Object.freeze(results),
});

await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(report));
} else {
  for (const result of report.results) {
    console.log(`${result.name}: ${Math.round(result.ops_per_second).toLocaleString("en-US")} ops/sec`);
  }
  console.log(`benchmark report: ${reportPath}`);
}


function createRecursiveCompatibilitySchema(minLength) {
  let schema;
  schema = lazy(
    () => object({
      children: array(schema),
      name: string({ minLength }),
    }),
    { id: "BenchmarkCompatibilityTreeNode" },
  );
  return schema;
}
