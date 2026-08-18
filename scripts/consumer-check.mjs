import assert from "node:assert/strict";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptsDir, "..");
const workspaceDir = resolve(rootDir, ".tmp", "consumer-check");
const tarballDir = resolve(workspaceDir, "tarballs");
const appDir = resolve(workspaceDir, "app");
const npmCacheDir = resolve(rootDir, ".npm-cache");
const rootPackage = JSON.parse(await readFile(resolve(rootDir, "package.json"), "utf8"));
const version = rootPackage.version;

assert.match(version, /^\d+\.\d+\.\d+$/);
const packages = [
  { name: "safe-shape", tarball: `safe-shape-${version}.tgz` },
  { name: "@safe-shape/core", tarball: `safe-shape-core-${version}.tgz` },
  { name: "@safe-shape/compat", tarball: `safe-shape-compat-${version}.tgz` },
  { name: "@safe-shape/http", tarball: `safe-shape-http-${version}.tgz` },
  { name: "@safe-shape/json-schema", tarball: `safe-shape-json-schema-${version}.tgz` },
  { name: "@safe-shape/typescript", tarball: `safe-shape-typescript-${version}.tgz` },
  { name: "@safe-shape/validation", tarball: `safe-shape-validation-${version}.tgz` },
  { name: "@safe-shape/cli", tarball: `safe-shape-cli-${version}.tgz` },
];

await rm(workspaceDir, { force: true, recursive: true });
await mkdir(tarballDir, { recursive: true });
await mkdir(appDir, { recursive: true });

for (const packageInfo of packages) {
  await run("npm", [
    "--cache",
    npmCacheDir,
    "pack",
    "--workspace",
    packageInfo.name,
    "--pack-destination",
    tarballDir,
  ], rootDir);
}

await writeFile(
  resolve(appDir, "package.json"),
  `${JSON.stringify({ name: "safe-shape-consumer-check", private: true, type: "module" }, null, 2)}\n`,
  "utf8",
);

await run("npm", [
  "--cache",
  npmCacheDir,
  "install",
  "--audit=false",
  "--fund=false",
  "--ignore-scripts",
  ...packages.map((packageInfo) => resolve(tarballDir, packageInfo.tarball)),
], appDir);

await writeFile(resolve(appDir, "schema.mjs"), schemaModuleSource(), "utf8");
await writeFile(resolve(appDir, "consumer.mjs"), consumerSource(), "utf8");

await run(process.execPath, [resolve(appDir, "consumer.mjs")], appDir);

const cliPath = resolve(appDir, "node_modules", ".bin", "safe-shape");
const doctor = await run(cliPath, ["--json", "doctor"], appDir);
assert.equal(JSON.parse(doctor.stdout).ok, true);

const exported = await run(cliPath, [
  "--json",
  "schema",
  "export",
  "--module",
  resolve(appDir, "schema.mjs"),
  "--export",
  "userSchema",
  "--id",
  "https://example.com/contracts/user",
], appDir);
assert.equal(JSON.parse(exported.stdout).schema.title, "User");
assert.equal(
  JSON.parse(exported.stdout).schema.$id,
  "https://example.com/contracts/user",
);

const snapshotPath = resolve(appDir, "user.contract.json");
const snapshotResult = await run(cliPath, [
  "--json",
  "contract",
  "snapshot",
  "--module",
  resolve(appDir, "schema.mjs"),
  "--export",
  "userSchema",
  "--id",
  "user",
  "--out",
  snapshotPath,
], appDir);
assert.equal(JSON.parse(snapshotResult.stdout).ok, true);

const compatibilityResult = await run(cliPath, [
  "--json",
  "contract",
  "check",
  "--module",
  resolve(appDir, "schema.mjs"),
  "--export",
  "userSchema",
  "--against",
  snapshotPath,
], appDir);
assert.equal(JSON.parse(compatibilityResult.stdout).status, "safe");

console.log("consumer-check: ok");

async function run(command, args, cwd) {
  const result = await spawnProcess(command, args, cwd);

  if (result.code !== 0) {
    throw new Error([
      `Command failed: ${command} ${args.join(" ")}`,
      `cwd: ${cwd}`,
      `exit code: ${result.code}`,
      result.stdout,
      result.stderr,
    ].filter(Boolean).join("\n"));
  }

  return result;
}

function spawnProcess(command, args, cwd) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolveRun({ code, stdout, stderr });
    });
  });
}

function schemaModuleSource() {
  return `import { literal, number, object, string, union } from "@safe-shape/core";

export const userSchema = object({
  id: string().annotate({ title: "User id" }),
  role: union([literal("admin"), literal("member")]),
  age: number().optional(),
}).annotate({ title: "User" });
`;
}

function consumerSource() {
  return `import assert from "node:assert/strict";
import {
  array,
  discriminatedUnion,
  enum as enumSchema,
  intersection,
  lazy,
  literal,
  never as neverSchema,
  number,
  object,
  record,
  string,
  tuple,
  unknown as unknownSchema,
} from "@safe-shape/core";
import {
  compareContracts,
  compareContractsV2,
  createHttpCompatibilityPresentation,
  createMigrationDiagnostics,
  createContractSnapshot,
  createContractSnapshotV2,
  parseContractSnapshotV2,
} from "@safe-shape/compat";
import { httpContract, safeParseHttpRequest } from "@safe-shape/http";
import {
  createStandardJsonSchema,
  safeToJsonSchema,
  toJsonSchema,
} from "@safe-shape/json-schema";
import { toTypeScriptType } from "@safe-shape/typescript";
import { validateSchema } from "@safe-shape/validation";
import {
  createContractSnapshot as umbrellaCreateContractSnapshot,
  object as umbrellaObject,
  string as umbrellaString,
  validateSchema as umbrellaValidateSchema,
} from "safe-shape";
import { userSchema } from "./schema.mjs";

const parsed = userSchema.parse({ id: "user_1", role: "admin", age: 42 });
assert.equal(parsed.id, "user_1");
assert.equal(userSchema["~standard"].version, 1);
assert.equal(userSchema["~standard"].vendor, "safe-shape");
const standardResult = userSchema["~standard"].validate({
  id: "user_1",
  role: "owner",
});
assert.equal(standardResult instanceof Promise, false);
assert.equal(standardResult.issues[0].code, "invalid_union");
assert.deepEqual(standardResult.issues[0].branches.map((branch) => branch.index), [0, 1]);
assert.equal(enumSchema(["draft", "published"]).parse("draft"), "draft");
assert.equal(unknownSchema().parse(parsed), parsed);
assert.equal(neverSchema().safeParse(parsed).success, false);
const eventSchema = discriminatedUnion("type", [
  object({ type: literal("created"), id: string() }),
  object({ type: literal("deleted"), id: string() }),
]);
assert.deepEqual(eventSchema.parse({ type: "created", id: "event_1" }), {
  type: "created",
  id: "event_1",
});
assert.equal(
  intersection(string({ minLength: 1 }), string({ maxLength: 10 })).parse("name"),
  "name",
);
const formattedString = string({
  pattern: "^[A-Z]{3}$",
  format: "email",
});
assert.equal(string({ format: "uuid" }).parse("550e8400-e29b-41d4-a716-446655440000"), "550e8400-e29b-41d4-a716-446655440000");
assert.equal(formattedString.safeParse("abc").success, false);
const amount = number({ minimum: 0, multipleOf: 0.01 });
const labels = record(string(), { key: { pattern: "^[a-z]+$" } });
assert.equal(amount.parse(12.34), 12.34);
assert.equal(amount.safeParse(12.345).success, false);
assert.deepEqual(labels.parse({ primary: "safe" }), { primary: "safe" });
const strippedObject = object(
  { id: string() },
  { unknownProperties: "strip" },
);
const openObject = object(
  { id: string() },
  { unknownProperties: "passthrough" },
);
assert.deepEqual(strippedObject.parse({ id: "user_1", removed: true }), { id: "user_1" });
assert.deepEqual(openObject.parse({ id: "user_1", preserved: true }), {
  id: "user_1",
  preserved: true,
});
const periodSchema = object({ start: number(), end: number() }).refineWithIssues(
  (value, context) => {
    if (value.start > value.end) {
      context.addIssue({ path: ["start"], message: "Start must not exceed end." });
      context.addIssue({ path: ["end"], message: "End must not precede start." });
    }
  },
  { id: "ordered-period/v1" },
);
const invalidPeriod = periodSchema.safeParse({ start: 5, end: 2 });
assert.equal(invalidPeriod.success, false);
assert.deepEqual(invalidPeriod.error.issues.map((issue) => issue.path), [
  ["start"],
  ["end"],
]);

const report = validateSchema(userSchema, { id: "user_2", role: "member" });
assert.deepEqual(report, {
  valid: true,
  data: { id: "user_2", role: "member" },
});
const failedReport = validateSchema(userSchema, { id: "user_2", role: "owner" });
assert.equal(failedReport.valid, false);
assert.deepEqual(failedReport.issues[0].branches.map((branch) => branch.index), [0, 1]);
assert.deepEqual(
  failedReport.issues[0].branches.map((branch) => branch.issues[0].path),
  [["role"], ["role"]],
);

const snapshot = createContractSnapshot(userSchema, { id: "user" });
assert.match(snapshot.fingerprint, /^sha256:/);
assert.equal(compareContracts(userSchema, userSchema).status, "safe");
assert.equal(
  compareContracts(
    enumSchema(["draft"]),
    enumSchema(["draft", "published"]),
  ).status,
  "safe",
);
assert.equal(
  compareContracts(
    tuple([string(), string()]),
    array(string(), { minLength: 2, maxLength: 2 }),
    { compatibility: "full" },
  ).status,
  "safe",
);
assert.equal(
  compareContracts(
    object({ id: string() }, { unknownProperties: "passthrough" }),
    object(
      { id: string(), label: unknownSchema().optional() },
      { unknownProperties: "passthrough" },
    ),
  ).status,
  "safe",
);
const migration = createMigrationDiagnostics(compareContracts(
  object({ id: string() }),
  object({ id: string(), label: string() }),
));
assert.equal(migration.decision, "migration-required");
assert.equal(migration.migrationRequired, true);
assert.equal(migration.diagnostics[0].code, "object.property.added.required");

let treeSchema;
treeSchema = lazy(() => object({ children: array(treeSchema) }), { id: "Tree" });
const graphSnapshot = createContractSnapshotV2(treeSchema, { id: "tree" });
assert.equal(graphSnapshot.format, "safe-shape.contract/v2");
assert.deepEqual(
  parseContractSnapshotV2(JSON.parse(JSON.stringify(graphSnapshot))),
  graphSnapshot,
);
let renamedTreeSchema;
renamedTreeSchema = lazy(
  () => object({ children: array(renamedTreeSchema) }),
  { id: "RenamedTree" },
);
assert.equal(compareContractsV2(treeSchema, renamedTreeSchema, {
  compatibility: "full",
  id: "tree",
}).status, "safe");
const requestCompatibility = createHttpCompatibilityPresentation(
  compareContractsV2(treeSchema, renamedTreeSchema, {
    compatibility: "full",
    id: "tree",
  }),
  { exchange: "request" },
);
assert.equal(requestCompatibility.producer, "client");
assert.equal(requestCompatibility.consumer, "server");
assert.equal(requestCompatibility.focus, "producer-and-consumer");
assert.deepEqual(toJsonSchema(treeSchema, {
  id: "https://example.com/contracts/tree",
  target: "draft-07",
}), {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://example.com/contracts/tree",
  $ref: "#/definitions/Tree",
  definitions: {
    Tree: {
      type: "object",
      properties: {
        children: {
          type: "array",
          items: { $ref: "#/definitions/Tree" },
        },
      },
      required: ["children"],
      additionalProperties: false,
    },
  },
});

const jsonSchema = toJsonSchema(userSchema);
assert.equal(jsonSchema.title, "User");
assert.equal(jsonSchema.properties.id.title, "User id");
assert.equal(toJsonSchema(eventSchema).oneOf.length, 2);
assert.equal(toJsonSchema(formattedString).format, "email");
assert.equal(toJsonSchema(amount).multipleOf, 0.01);
assert.deepEqual(toJsonSchema(labels).propertyNames, {
  type: "string",
  pattern: "^[a-z]+$",
});
assert.equal(toJsonSchema(strippedObject).additionalProperties, true);
assert.equal(toJsonSchema(strippedObject, { side: "output" }).additionalProperties, false);
const failedJsonSchema = safeToJsonSchema(
  string().refine((value) => value.length > 0, { id: "non-empty/v1" }),
);
assert.equal(failedJsonSchema.success, false);
assert.equal(
  failedJsonSchema.issues[0].code,
  "json_schema.refinement.unrepresentable",
);
assert.match(toTypeScriptType(openObject), /readonly \\[key: string\\]: unknown/);
const standardJsonSchema = createStandardJsonSchema(strippedObject);
assert.equal(
  standardJsonSchema["~standard"].jsonSchema.input({ target: "draft-2020-12" })
    .additionalProperties,
  true,
);
assert.equal(
  standardJsonSchema["~standard"].jsonSchema.output({ target: "draft-2020-12" })
    .additionalProperties,
  false,
);
assert.equal(
  standardJsonSchema["~standard"].jsonSchema.input({
    target: "draft-07",
    libraryOptions: { id: "https://example.com/contracts/stripped" },
  })
    .$schema,
  "http://json-schema.org/draft-07/schema#",
);
assert.equal(
  standardJsonSchema["~standard"].jsonSchema.input({
    target: "draft-07",
    libraryOptions: { id: "https://example.com/contracts/stripped" },
  }).$id,
  "https://example.com/contracts/stripped",
);

const source = toTypeScriptType(userSchema, { name: "User" });
assert.match(source, /export type User/);
assert.match(source, /role: "admin" \\| "member"/);

const contract = httpContract({
  params: object({ id: string() }),
});
const request = safeParseHttpRequest(contract, { params: { id: "user_1" } });
assert.equal(request.success, true);

const umbrellaSchema = umbrellaObject({ id: umbrellaString() });
assert.equal(umbrellaCreateContractSnapshot(umbrellaSchema, { id: "umbrella" }).id, "umbrella");
assert.deepEqual(umbrellaValidateSchema(umbrellaSchema, { id: "user_3" }), {
  valid: true,
  data: { id: "user_3" },
});
`;
}
