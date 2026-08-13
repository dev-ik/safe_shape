import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const expectedPackages = [
  "packages/safe-shape",
  "packages/core",
  "packages/http",
  "packages/json-schema",
  "packages/typescript",
  "packages/validation",
  "packages/cli",
];
const packageDocs = new Map([
  ["safe-shape", "docs/api/safe-shape.md"],
  ["@safe-shape/core", "docs/api/core.md"],
  ["@safe-shape/http", "docs/api/http.md"],
  ["@safe-shape/json-schema", "docs/api/json-schema.md"],
  ["@safe-shape/typescript", "docs/api/typescript.md"],
  ["@safe-shape/validation", "docs/api/validation.md"],
  ["@safe-shape/cli", "docs/api/cli.md"],
]);
const expectedDeps = new Map([
  [
    "safe-shape",
    [
      "@safe-shape/cli",
      "@safe-shape/core",
      "@safe-shape/http",
      "@safe-shape/json-schema",
      "@safe-shape/typescript",
      "@safe-shape/validation",
    ],
  ],
  ["@safe-shape/core", []],
  ["@safe-shape/http", ["@safe-shape/core"]],
  ["@safe-shape/json-schema", ["@safe-shape/core"]],
  ["@safe-shape/typescript", ["@safe-shape/core"]],
  ["@safe-shape/validation", ["@safe-shape/core"]],
  [
    "@safe-shape/cli",
    [
      "@safe-shape/core",
      "@safe-shape/json-schema",
      "@safe-shape/typescript",
      "@safe-shape/validation",
    ],
  ],
]);

const failures = [];
const rootPackage = readJson("package.json");

assertArrayEqual(rootPackage.workspaces, expectedPackages, "root workspaces");
assert(rootPackage.private === true, "root workspace must remain private");
assertExists("docs/integration.md", "project integration documentation");
assertExists("docs/publish-readiness.md", "publish readiness documentation");
assertExists("docs/benchmarks.md", "benchmark documentation");
assertExists("benchmarks/run.mjs", "benchmark runner");

for (const packagePath of expectedPackages) {
  checkPackage(packagePath);
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`release-check: ${failure}`);
  }
  process.exitCode = 1;
} else {
  console.log(`release-check: ok (${expectedPackages.length} packages)`);
}

function checkPackage(packagePath) {
  const manifestPath = join(packagePath, "package.json");
  const manifest = readJson(manifestPath);
  const packageName = manifest.name;

  assert(
    packageName === "safe-shape" || packageName?.startsWith("@safe-shape/"),
    `${manifestPath} must use safe-shape package naming`,
  );
  assert(manifest.version === rootPackage.version, `${packageName} version must match root version`);
  assert(manifest.type === "module", `${packageName} must be ESM`);
  assert(manifest.private !== true, `${packageName} must be publishable`);
  if (packageName.startsWith("@safe-shape/")) {
    assert(manifest.publishConfig?.access === "public", `${packageName} publishConfig.access must be public`);
  }
  assert(manifest.engines?.node === ">=20.10", `${packageName} must declare Node >=20.10`);
  assertArrayEqual(manifest.files, ["dist", "README.md"], `${packageName} files`);
  assertExists(join(packagePath, "README.md"), `${packageName} README.md`);
  assertExists(packageDocs.get(packageName), `${packageName} API documentation`);

  if (packageName === "@safe-shape/cli") {
    assert(manifest.bin?.["safe-shape"] === "./dist/cli.js", "@safe-shape/cli bin must expose safe-shape");
    assertExists(join(packagePath, "dist", "cli.js"), "@safe-shape/cli dist/cli.js");
    assertExists(join(packagePath, "dist", "cli.d.ts"), "@safe-shape/cli dist/cli.d.ts");
  } else if (packageName === "safe-shape") {
    assert(manifest.exports?.["."]?.import === "./dist/index.js", "safe-shape export import");
    assert(manifest.exports?.["."]?.types === "./dist/index.d.ts", "safe-shape export types");
    assertExists(join(packagePath, "dist", "index.js"), "safe-shape dist/index.js");
    assertExists(join(packagePath, "dist", "index.d.ts"), "safe-shape dist/index.d.ts");
  } else {
    assert(manifest.exports?.["."]?.import === "./dist/index.js", `${packageName} export import`);
    assert(manifest.exports?.["."]?.types === "./dist/index.d.ts", `${packageName} export types`);
    assertExists(join(packagePath, "dist", "index.js"), `${packageName} dist/index.js`);
    assertExists(join(packagePath, "dist", "index.d.ts"), `${packageName} dist/index.d.ts`);
  }

  assertArrayEqual(
    Object.keys(manifest.dependencies ?? {}),
    expectedDeps.get(packageName) ?? [],
    `${packageName} dependencies`,
  );
}

function readJson(path) {
  return JSON.parse(readFileSync(join(root, path), "utf8"));
}

function assert(condition, message) {
  if (!condition) {
    failures.push(message);
  }
}

function assertExists(path, message) {
  if (path === undefined || !existsSync(join(root, path))) {
    failures.push(`${message} must exist`);
  }
}

function assertArrayEqual(actual, expected, message) {
  const actualJson = JSON.stringify(actual ?? []);
  const expectedJson = JSON.stringify(expected);

  if (actualJson !== expectedJson) {
    failures.push(`${message} expected ${expectedJson}, got ${actualJson}`);
  }
}
