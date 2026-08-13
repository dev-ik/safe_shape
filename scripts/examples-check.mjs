import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptsDir, "..");
const cliPath = resolve(rootDir, "packages/cli/dist/cli.js");
const schemaModulePath = resolve(rootDir, "examples/user-schema.mjs");
const validUserPath = resolve(rootDir, "examples/valid-user.json");
const invalidUserPath = resolve(rootDir, "examples/invalid-user.json");

const exported = await runCli([
  "--json",
  "schema",
  "export",
  "--module",
  schemaModulePath,
  "--export",
  "userSchema",
  "--schema",
  "https://json-schema.org/draft/2020-12/schema",
]);

assert.equal(exported.code, 0);
const exportedPayload = parseJson(exported.stdout);
assert.equal(exportedPayload.ok, true);
assert.equal(exportedPayload.schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(exportedPayload.schema.title, "User");
assert.equal(exportedPayload.schema.properties.id.title, "User id");

const valid = await runCli([
  "--json",
  "schema",
  "validate",
  "--module",
  schemaModulePath,
  "--export",
  "userSchema",
  "--input",
  validUserPath,
]);

assert.equal(valid.code, 0);
assert.deepEqual(parseJson(valid.stdout), {
  ok: true,
  command: "schema validate",
  module: schemaModulePath,
  export: "userSchema",
  input: validUserPath,
  valid: true,
  data: {
    id: "user_1",
    role: "admin",
    age: 42,
  },
});

const invalid = await runCli([
  "--json",
  "schema",
  "validate",
  "--module",
  schemaModulePath,
  "--export",
  "userSchema",
  "--input",
  invalidUserPath,
]);

assert.equal(invalid.code, 1);
const invalidPayload = parseJson(invalid.stdout);
assert.equal(invalidPayload.ok, false);
assert.equal(invalidPayload.valid, false);
assert.deepEqual(invalidPayload.issues.map((issue) => issue.path), [["id"], ["role"]]);

const types = await runCli([
  "--json",
  "schema",
  "types",
  "--module",
  schemaModulePath,
  "--export",
  "userSchema",
  "--name",
  "User",
]);

assert.equal(types.code, 0);
assert.deepEqual(parseJson(types.stdout), {
  ok: true,
  command: "schema types",
  module: schemaModulePath,
  export: "userSchema",
  type: "User",
  source: `export type User = {
  id: string;
  role: "admin" | "member";
  age?: number;
};
`,
});

console.log("examples-check: ok");

function runCli(args) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], {
      cwd: rootDir,
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

function parseJson(source) {
  return JSON.parse(source);
}
