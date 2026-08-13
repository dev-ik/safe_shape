import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptsDir, "..");
const workspaceDir = resolve(rootDir, ".tmp", "consumer-check");
const tarballDir = resolve(workspaceDir, "tarballs");
const appDir = resolve(workspaceDir, "app");
const npmCacheDir = resolve(rootDir, ".npm-cache");
const version = "1.0.0";
const packages = [
  { name: "safe-shape", tarball: `safe-shape-${version}.tgz` },
  { name: "@safe-shape/core", tarball: `safe-shape-core-${version}.tgz` },
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
], appDir);
assert.equal(JSON.parse(exported.stdout).schema.title, "User");

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
import { object, string } from "@safe-shape/core";
import { httpContract, safeParseHttpRequest } from "@safe-shape/http";
import { toJsonSchema } from "@safe-shape/json-schema";
import { toTypeScriptType } from "@safe-shape/typescript";
import { validateSchema } from "@safe-shape/validation";
import {
  object as umbrellaObject,
  string as umbrellaString,
  validateSchema as umbrellaValidateSchema,
} from "safe-shape";
import { userSchema } from "./schema.mjs";

const parsed = userSchema.parse({ id: "user_1", role: "admin", age: 42 });
assert.equal(parsed.id, "user_1");

const report = validateSchema(userSchema, { id: "user_2", role: "member" });
assert.deepEqual(report, {
  valid: true,
  data: { id: "user_2", role: "member" },
});

const jsonSchema = toJsonSchema(userSchema);
assert.equal(jsonSchema.title, "User");
assert.equal(jsonSchema.properties.id.title, "User id");

const source = toTypeScriptType(userSchema, { name: "User" });
assert.match(source, /export type User/);
assert.match(source, /role: "admin" \\| "member"/);

const contract = httpContract({
  params: object({ id: string() }),
});
const request = safeParseHttpRequest(contract, { params: { id: "user_1" } });
assert.equal(request.success, true);

const umbrellaSchema = umbrellaObject({ id: umbrellaString() });
assert.deepEqual(umbrellaValidateSchema(umbrellaSchema, { id: "user_3" }), {
  valid: true,
  data: { id: "user_3" },
});
`;
}
