#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
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
  lazy,
  literal,
  nullable,
  number,
  object,
  record,
  string,
  tuple,
  union,
} = core;
const { compareContracts, compareContractsV2 } = compat;

const stringSchema = string();
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

const cases = [
  {
    name: "primitive string safeParse valid",
    iterations: 500_000,
    run: () => stringSchema.safeParse("safe-shape"),
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
  },
  {
    name: "union event safeParse valid",
    iterations: 100_000,
    run: () => eventSchema.safeParse(validEvent),
  },
  {
    name: "union event safeParse invalid with branch diagnostics",
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
    iterations: 100_000,
    run: () => userSchema.safeParse(invalidUser),
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
  results.push(runCase(benchmarkCase));
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

function runCase(benchmarkCase) {
  for (let index = 0; index < Math.min(10_000, benchmarkCase.iterations); index += 1) {
    benchmarkCase.run();
  }

  let successes = 0;
  let failures = 0;
  const startedAt = performance.now();

  for (let index = 0; index < benchmarkCase.iterations; index += 1) {
    const result = benchmarkCase.run();
    const accepted = benchmarkCase.accept?.(result) ?? result.success;
    if (accepted) {
      successes += 1;
    } else {
      failures += 1;
    }
  }

  const durationMs = performance.now() - startedAt;
  const opsPerSecond = benchmarkCase.iterations / (durationMs / 1000);

  if (!Number.isFinite(opsPerSecond) || opsPerSecond <= 0) {
    throw new Error(`Invalid benchmark result for ${benchmarkCase.name}`);
  }

  return Object.freeze({
    name: benchmarkCase.name,
    iterations: benchmarkCase.iterations,
    duration_ms: Number(durationMs.toFixed(3)),
    ops_per_second: Number(opsPerSecond.toFixed(3)),
    successes,
    failures,
  });
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
