import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const expectedPackages = [
  "packages/safe-shape",
  "packages/core",
  "packages/compat",
  "packages/http",
  "packages/json-schema",
  "packages/typescript",
  "packages/validation",
  "packages/cli",
];
const packageDocs = new Map([
  ["safe-shape", "docs/api/safe-shape.md"],
  ["@safe-shape/core", "docs/api/core.md"],
  ["@safe-shape/compat", "docs/api/compat.md"],
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
      "@safe-shape/compat",
      "@safe-shape/core",
      "@safe-shape/http",
      "@safe-shape/json-schema",
      "@safe-shape/typescript",
      "@safe-shape/validation",
    ],
  ],
  ["@safe-shape/core", []],
  ["@safe-shape/compat", ["@safe-shape/core"]],
  ["@safe-shape/http", ["@safe-shape/core"]],
  ["@safe-shape/json-schema", ["@safe-shape/core"]],
  ["@safe-shape/typescript", ["@safe-shape/core"]],
  ["@safe-shape/validation", ["@safe-shape/core"]],
  [
    "@safe-shape/cli",
    [
      "@safe-shape/compat",
      "@safe-shape/core",
      "@safe-shape/json-schema",
      "@safe-shape/typescript",
      "@safe-shape/validation",
    ],
  ],
]);

const failures = [];
const rootPackage = readJson("package.json");
const releaseVersion = rootPackage.version;

assert(
  typeof releaseVersion === "string" && /^\d+\.\d+\.\d+$/.test(releaseVersion),
  `root version must be a stable semantic version, got ${String(releaseVersion)}`,
);
assert(releaseVersion !== "0.0.0", "release version must not be 0.0.0");

assertArrayEqual(rootPackage.workspaces, expectedPackages, "root workspaces");
assert(rootPackage.private === true, "root workspace must remain private");
assertExists("docs/integration.md", "project integration documentation");
assertExists("docs/migration-1-to-2.md", "1.x to 2.0 migration guide");
assertExists("docs/publish-readiness.md", "publish readiness documentation");
assertExists("docs/benchmarks.md", "benchmark documentation");
assertExists("benchmarks/run.mjs", "benchmark runner");
checkPublishWorkflow();
checkDecisionStatuses("rfc");
checkDecisionStatuses("adr");

for (const packagePath of expectedPackages) {
  checkPackage(packagePath);
}

if (process.env["REQUIRE_RELEASE_TAG"] === "true") {
  const tag = process.env["GITHUB_REF_NAME"];
  assert(tag === `v${releaseVersion}`, `release tag ${String(tag)} must match v${releaseVersion}`);

  if (
    failures.length === 0
    && process.env["ALLOW_ALREADY_PUBLISHED_RELEASE_PACKAGES"] !== "true"
  ) {
    await Promise.all(
      expectedPackages.map((packagePath) => {
        const manifest = readJson(join(packagePath, "package.json"));
        return assertVersionIsNotPublished(manifest.name, releaseVersion);
      }),
    );
  }
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
  for (const [dependencyName, dependencyVersion] of Object.entries(manifest.dependencies ?? {})) {
    assert(
      dependencyVersion === releaseVersion,
      `${packageName} dependency ${dependencyName} must use release version ${releaseVersion}`,
    );
  }
  checkSourceDependencyDirection(packagePath, packageName);
}

function checkSourceDependencyDirection(packagePath, packageName) {
  const allowedDependencies = new Set(expectedDeps.get(packageName) ?? []);
  const sourceRoot = join(root, packagePath, "src");

  for (const sourcePath of listSourceFiles(sourceRoot)) {
    const source = readFileSync(sourcePath, "utf8");
    const imports = source.matchAll(
      /(?:from\s+|import\s*\(\s*)["'](safe-shape|@safe-shape\/[^"']+)["']/g,
    );

    for (const match of imports) {
      const dependencyName = match[1];
      assert(
        allowedDependencies.has(dependencyName),
        `${packageName} source import ${dependencyName} must follow package dependency direction`,
      );
    }
  }
}

function listSourceFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return listSourceFiles(entryPath);
    return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
  });
}

function checkDecisionStatuses(directory) {
  const decisionRoot = join(root, directory);
  const decisionFiles = readdirSync(decisionRoot, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(decisionRoot, entry.name));

  assert(decisionFiles.length > 0, `${directory} must contain decision documents`);
  for (const decisionPath of decisionFiles) {
    const decision = readFileSync(decisionPath, "utf8");
    const relativePath = decisionPath.slice(root.length + 1);
    assert(
      /^## Status\s*\n+\s*Accepted\b/m.test(decision),
      `${relativePath} must have an Accepted status`,
    );
  }
}

function checkPublishWorkflow() {
  const workflowPath = ".github/workflows/publish.yml";
  assertExists(workflowPath, "GitHub Actions publish workflow");
  if (!existsSync(join(root, workflowPath))) return;

  const workflow = readFileSync(join(root, workflowPath), "utf8");
  assert(
    workflow.includes('npm view "@safe-shape/compat@${VERSION}" version'),
    "publish workflow must verify the manually published compatibility package",
  );
  assert(
    !/npm publish[^\n]*safe-shape-compat/.test(workflow),
    "publish workflow must not automatically publish the new compatibility package",
  );
  assert(
    workflow.includes("publish_if_missing"),
    "publish workflow must make established package publication idempotent",
  );
  assert(
    workflow.includes("uses: actions/upload-artifact@v4"),
    "publish workflow must retain bootstrap release artifacts",
  );
  assert(
    workflow.includes("ALLOW_ALREADY_PUBLISHED_RELEASE_PACKAGES: 'true'"),
    "publish workflow must allow its tagged bootstrap rerun after publishing core",
  );
  assert(
    workflow.includes("- bootstrap-core")
      && workflow.includes("if: inputs.phase == 'release'"),
    "publish workflow must separate core bootstrap from final release publication",
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

async function assertVersionIsNotPublished(packageName, version) {
  const encodedName = packageName.replace("/", "%2F");
  const response = await fetch(`https://registry.npmjs.org/${encodedName}/${version}`, {
    headers: { accept: "application/json" },
  });

  if (response.status === 404) return;
  if (response.ok) {
    throw new Error(`${packageName}@${version} is already published to npm`);
  }

  throw new Error(
    `unable to check ${packageName}@${version} in npm: HTTP ${response.status}`,
  );
}
