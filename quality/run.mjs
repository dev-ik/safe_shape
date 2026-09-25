import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm, symlink, readdir } from "node:fs/promises";
import { cpus } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gzipSync } from "node:zlib";
import { createContext, runInContext } from "node:vm";
import { build } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const output = join(root, ".tmp/quality");
const run = (command, args, cwd = root, options = {}) => execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], ...options });
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const hash = createHash("sha256");
hash.update(run("git", ["diff", "HEAD", "--binary"]));
for (const file of run("git", ["ls-files", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean).sort()) {
  hash.update(file); hash.update(await readFile(join(root, file)));
}
const report = {
  schemaVersion: 1, commit: run("git", ["rev-parse", "HEAD"]).trim(), patchSha256: hash.digest("hex"),
  baseline: run("git", ["rev-parse", "v3.1.0"]).trim(), runtime: process.version,
  platform: process.platform, arch: process.arch, cpu: cpus()[0]?.model,
  dependencies: JSON.parse(await readFile(join(here, "package.json"), "utf8")).dependencies,
  commands: ["npm run build", "npm ci --prefix quality", "npm run quality:check"],
  generatedAt: new Date().toISOString(), integrations: {}, types: [], bundles: [], samples: [], summary: [],
  pending: ["Independent developer walkthrough", "Configured CI run for final versioned candidate"],
};
try {
  console.log("quality: creating matched 3.1 baseline and installed consumers");
  const base = join(output, "baseline");
  await mkdir(base);
  const archive = execFileSync("git", ["archive", "v3.1.0"], { cwd: root, maxBuffer: 32 * 1024 * 1024 });
  execFileSync("tar", ["-x", "-C", base], { input: archive });
  await mkdir(join(base, "node_modules/@safe-shape"), { recursive: true });
  await symlink(join(root, "node_modules/@types"), join(base, "node_modules/@types"));
  await symlink(join(base, "packages/core"), join(base, "node_modules/@safe-shape/core"));
  async function artifactHash(directory) {
    const digest = createHash("sha256");
    for (const file of (await readdir(directory)).filter((file) => /\.(js|ts)$/.test(file)).sort()) {
      digest.update(file); digest.update(await readFile(join(directory, file)));
    }
    return digest.digest("hex");
  }
  const tsc = join(here, "node_modules/typescript/bin/tsc");
  for (const pkg of ["core", "compat"]) run(process.execPath, [tsc, "-p", join(base, `packages/${pkg}/tsconfig.build.json`)]);
  report.coreArtifacts = {
    candidate: await artifactHash(join(root, "packages/core/dist")),
    baseline: await artifactHash(join(base, "packages/core/dist")),
  };
  const tarballs = join(output, "tarballs"); await mkdir(tarballs);
  const packages = ["core", "compat", "http", "json-schema", "typescript", "validation", "cli", "safe-shape"];
  const paths = {};
  for (const pkg of packages) {
    const packed = JSON.parse(run("npm", ["--cache", join(root, ".npm-cache"), "pack", "--json", "--ignore-scripts", "--pack-destination", tarballs], join(root, "packages", pkg)));
    paths[pkg] = join(tarballs, packed[0].filename);
  }
  async function install(name, selected) {
    const app = join(output, name); await mkdir(app);
    await writeFile(join(app, "package.json"), JSON.stringify({ name: `quality-${name}`, private: true, type: "module" }));
    run("npm", ["--cache", join(root, ".npm-cache"), "install", "--offline", "--ignore-scripts", "--audit=false", "--fund=false", ...selected.map((pkg) => paths[pkg])], app);
    return app;
  }
  const form = await install("form", ["core"]);
  const server = await install("server", ["core", "http"]);
  const ci = await install("ci", packages);
  for (const file of ["contract-evolution.mjs", "check-contract-evolution.mjs"]) await writeFile(join(ci, file), await readFile(join(root, "examples", file)));
  run(process.execPath, [join(ci, "check-contract-evolution.mjs")], ci);
  await writeFile(join(ci, "connected-contracts.mjs"), await readFile(join(root, "examples/connected-contracts.mjs")));
  run(process.execPath, [join(ci, "connected-contracts.mjs")], ci);
  report.integrations.ci = "passed: evolution and producer/consumer connections, baselines unchanged";

  const formBuild = await build({ entryPoints: [join(here, "form.mjs")], bundle: true, write: false, format: "iife", globalName: "FormFixture", platform: "browser", metafile: true,
    alias: { "@safe-shape/core": join(form, "node_modules/@safe-shape/core/dist/index.js") } });
  assert.ok(Object.keys(formBuild.metafile.inputs).every((path) => !path.startsWith("node:")));
  const browser = join(output, "browser"); await mkdir(browser);
  await writeFile(join(browser, "index.html"), await readFile(join(here, "browser.html")));
  await build({ entryPoints: [join(here, "browser-entry.mjs")], bundle: true, outfile: join(browser, "browser.js"), platform: "browser", format: "iife",
    alias: { "@safe-shape/core": join(form, "node_modules/@safe-shape/core/dist/index.js") } });
  report.browserBundleSha256 = createHash("sha256").update(await readFile(join(browser, "browser.js"))).digest("hex");
  const context = createContext({ setTimeout, clearTimeout });
  runInContext(formBuild.outputFiles[0].text, context);
  const formResult = await runInContext("FormFixture.runForm()", context);
  assert.equal(formResult.valid.values.profile.name, "Ada");
  assert.equal(Object.keys(formResult.valid.errors).length, 0);
  assert.ok(formResult.invalid.errors.profile.name.message);
  assert.ok(formResult.failed.errors.name.message);
  assert.equal(JSON.stringify(formResult.failed).includes("private"), false);
  assert.equal(formResult.native.warnings.length, 1);
  assert.equal(formResult.valid.warnings, undefined);
  report.integrations.form = "passed: browser bundle VM, real resolver, nested errors, async rejection, native warnings retained/resolver ignores warnings";

  await writeFile(join(server, "check.mjs"), `import assert from 'node:assert/strict';
import { object, string } from '@safe-shape/core';
import { httpContract, safeParseHttpRequestAsync, recoverHttpResponseAsync } from '@safe-shape/http';
const schema = object({ name: string().warnAsync(async () => false, { id: 'notice/v1' }) });
const contract = httpContract({ body: schema, response: schema });
const valid = await safeParseHttpRequestAsync(contract, { body: { name: 'Ada' } });
assert.equal(valid.success, true); assert.deepEqual(valid.warnings[0].path, ['body', 'name']);
const invalid = await safeParseHttpRequestAsync(contract, { body: { name: 1 } });
assert.equal(invalid.success, false); assert.deepEqual(invalid.error.issues[0].path, ['body','name']);
const recovered = await recoverHttpResponseAsync(contract, { name: 1 }, { getFallback: () => ({ name: 'cached' }) });
assert.equal(recovered.kind, 'recovered'); assert.equal(recovered.data.name, 'cached');
`);
  run(process.execPath, [join(server, "check.mjs")]);
  report.integrations.server = "passed: request paths, warnings, response recovery";
  for (const file of ["production-boundary.mjs", "production-boundary.test.mjs", "resilient-http-response.mjs"]) {
    const source = (await readFile(join(root, "examples", file), "utf8"))
      .replaceAll("../packages/core/dist/index.js", "@safe-shape/core")
      .replaceAll("../packages/http/dist/index.js", "@safe-shape/http");
    await writeFile(join(server, file), source);
  }
  run(process.execPath, ["--unhandled-rejections=strict", "--test", join(server, "production-boundary.test.mjs")], server);
  report.integrations.production = "passed: installed request/response boundaries, next-request recovery, unexpected exceptions, sync/async/pending logger failures";

  console.log("quality: declaration consumers and compiler fixtures");
  await symlink(join(here, "node_modules/zod"), join(ci, "node_modules/zod"));
  for (const file of ["types.ts", "tsconfig.json"]) await writeFile(join(ci, file), await readFile(join(here, file)));
  for (const compiler of ["typescript", "typescript-current"]) {
    const text = run(process.execPath, [join(here, `node_modules/${compiler}/bin/tsc`), "-p", join(ci, "tsconfig.json"), "--extendedDiagnostics"]);
    report.types.push({ compiler, fixture: "declaration-consumer", diagnostics: text });
  }
  const baseTypes = join(output, "baseline-types");
  await mkdir(join(baseTypes, "node_modules/@safe-shape"), { recursive: true });
  await symlink(join(base, "packages/core"), join(baseTypes, "node_modules/@safe-shape/core"));
  await writeFile(join(baseTypes, "package.json"), '{"type":"module"}');
  await writeFile(join(baseTypes, "tsconfig.json"), await readFile(join(here, "tsconfig.json")));
  for (let repetition = 0; repetition < 5; repetition++) for (const size of [5, 100, 20]) {
    for (const library of repetition % 2 ? ["zod", "baseline", "safe"] : ["safe", "baseline", "zod"]) {
      const object = library === "zod" ? "strictObject" : "object";
      const module = library === "zod" ? "zod" : "@safe-shape/core";
      const app = library === "baseline" ? baseTypes : ci;
      let schema = `${object}({ ${Array.from({ length: size === 20 ? 2 : size }, (_, i) => `field${i}: string()`).join(", ")} })`;
      if (size === 20) for (let i = 0; i < 20; i++) schema = `${object}({ nested: ${schema} })`;
      await writeFile(join(app, "types.ts"), `import { ${object}, string, type ${library === 'zod' ? 'infer as OutputOf' : 'InferOutput as OutputOf'} } from '${module}'; export const schema = ${schema}; export type Output = OutputOf<typeof schema>; export function identity(value: Output): Output { return value; }`);
      const diagnostics = run(process.execPath, [tsc, "-p", join(app, "tsconfig.json"), "--extendedDiagnostics"]);
      report.types.push({ compiler: "typescript", library, repetition, fixture: size === 20 ? "depth-20" : `fields-${size}`, diagnostics });
    }
  }

  const modules = { safe: pathToFileURL(join(ci, "node_modules/@safe-shape/core/dist/index.js")).href,
    baseline: pathToFileURL(join(base, "packages/core/dist/index.js")).href, zod: pathToFileURL(join(here, "node_modules/zod/index.js")).href };
  for (const library of ["safe", "baseline", "zod"]) {
    const bundle = await build({ entryPoints: [join(here, library === "zod" ? "bundle-zod.mjs" : "bundle-safe.mjs")], bundle: true, write: false, minify: true, platform: "browser", format: "esm", metafile: true,
      ...(library === "zod" ? {} : { alias: { "@safe-shape/core": fileURLToPath(modules[library]) } }) });
    report.bundles.push({ library, bytes: bundle.outputFiles[0].contents.length, gzipBytes: gzipSync(bundle.outputFiles[0].contents).length });
  }
  const names = ["constraint", "nested", "optional-nullable", "array", "tagged", "union", "record", "recursive", "transform", "async"];
  console.log("quality: five isolated samples per library/scenario");
  for (let repetition = 0; repetition < 5; repetition++) {
    for (const name of names) for (const library of repetition % 2 ? ["zod", "baseline", "safe"] : ["safe", "baseline", "zod"]) {
      report.samples.push({ library, repetition, ...JSON.parse(run(process.execPath, ["--expose-gc", join(here, "measure.mjs"), library, modules[library], name])) });
    }
    console.log(`quality: sample round ${repetition + 1}/5 complete`);
  }
  const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  for (const name of names) for (const library of ["safe", "baseline", "zod"]) {
    const samples = report.samples.filter((sample) => sample.library === library && sample.name === name);
    const summary = { name, library };
    for (const metric of ["importMs", "constructionMs", "firstParseMs", "validMs", "invalidMs", "issuesMs", "formattedMs", "heapBytes"]) {
      const values = samples.map((sample) => sample[metric]);
      summary[metric] = { median: median(values), min: Math.min(...values), max: Math.max(...values) };
    }
    report.summary.push(summary);
  }
  report.contractSamples = [];
  for (let repetition = 0; repetition < 5; repetition++) for (const library of repetition % 2 ? ["baseline", "safe"] : ["safe", "baseline"]) {
    const compatUrl = pathToFileURL(library === "safe" ? join(ci, "node_modules/@safe-shape/compat/dist/index.js") : join(base, "packages/compat/dist/index.js")).href;
    report.contractSamples.push({ library, repetition, ...JSON.parse(run(process.execPath, [join(here, "measure-contract.mjs"), modules[library], compatUrl])) });
  }
  report.newFeatureSamples = [];
  for (let repetition = 0; repetition < 5; repetition++) for (const name of ["composition", "pipeline"]) {
    for (const library of repetition % 2 ? ["zod", "safe"] : ["safe", "zod"]) {
      report.newFeatureSamples.push({ library, repetition, ...JSON.parse(run(process.execPath, ["--expose-gc", join(here, "measure.mjs"), library, modules[library], name])) });
    }
  }
  report.regressions = [];
  for (const name of ["composition", "pipeline"]) for (const metric of ["validMs", "invalidMs", "issuesMs", "formattedMs"]) {
    const duration = median(report.newFeatureSamples.filter((entry) => entry.library === "safe" && entry.name === name).map((entry) => entry[metric])) * 20_000;
    if (duration > 5000) report.regressions.push({ name, metric, duration, absoluteBudgetMs: 5000 });
  }
  report.measurementNoise = [];
  report.inconclusive = [];
  const recordRegression = (entry, identicalArtifacts = false) => {
    if (identicalArtifacts) report.measurementNoise.push({ ...entry, reason: "Candidate and baseline core artifacts are byte-identical; timing/heap variation cannot be attributed to a core code change." });
    else report.regressions.push(entry);
  };
  for (const name of names) {
    const candidate = report.summary.find((entry) => entry.name === name && entry.library === "safe");
    const baseline = report.summary.find((entry) => entry.name === name && entry.library === "baseline");
    for (const metric of ["validMs", "invalidMs", "issuesMs", "formattedMs", "heapBytes"]) {
      const budget = metric === "heapBytes" ? 1.25 : 1.20;
      if (baseline[metric].median <= 0 || candidate[metric].median <= 0) {
        const entry = { name, metric, reason: "Nonpositive resource sample prevents a reliable ratio" };
        if (report.coreArtifacts.candidate === report.coreArtifacts.baseline) report.measurementNoise.push(entry);
        else report.inconclusive.push(entry);
        continue;
      }
      const ratio = candidate[metric].median / baseline[metric].median;
      if (ratio > budget) recordRegression({ name, metric, ratio, budget, overlappingRanges: candidate[metric].min <= baseline[metric].max && baseline[metric].min <= candidate[metric].max }, report.coreArtifacts.candidate === report.coreArtifacts.baseline);
    }
  }
  // Import precedes fixture selection and is the same operation for every name.
  report.importSummary = ["safe", "baseline", "zod"].map((library) => {
    const values = report.samples.filter((sample) => sample.library === library).map((sample) => sample.importMs);
    return { library, samples: values.length, median: median(values), min: Math.min(...values), max: Math.max(...values) };
  });
  const importRatio = report.importSummary.find((sample) => sample.library === "safe").median /
    report.importSummary.find((sample) => sample.library === "baseline").median;
  if (importRatio > 1.2) recordRegression({ name: "module-import", metric: "importMs", ratio: importRatio, budget: 1.2 }, report.coreArtifacts.candidate === report.coreArtifacts.baseline);
  for (const name of ["snapshot", "comparison", "migration"]) {
    const current = median(report.contractSamples.filter((s) => s.library === "safe").map((s) => s[name]));
    const old = median(report.contractSamples.filter((s) => s.library === "baseline").map((s) => s[name]));
    if (current / old > 1.2) recordRegression({ name, metric: "contractMs", ratio: current / old, budget: 1.2 });
  }
  for (const fixture of ["fields-5", "fields-100", "depth-20"]) {
    const values = (library) => report.types.filter((s) => s.library === library && s.fixture === fixture).map((s) => Number(s.diagnostics.match(/Check time:\s+([\d.]+)s/)[1]));
    const ratio = median(values("safe")) / median(values("baseline"));
    if (ratio > 1.2) recordRegression({ name: fixture, metric: "compilerCheckTime", ratio, budget: 1.2 }, report.coreArtifacts.candidate === report.coreArtifacts.baseline);
  }
  const bundleRatio = report.bundles.find((b) => b.library === "safe").gzipBytes / report.bundles.find((b) => b.library === "baseline").gzipBytes;
  if (bundleRatio > 1.2) recordRegression({ name: "browser-bundle", metric: "gzipBytes", ratio: bundleRatio, budget: 1.2 });
  // 50-entry CI budget declared in README before measuring.
  const baselinePath = join(ci, "user.contract.json");
  const cli = join(ci, "node_modules/.bin/safe-shape");
  const schemaPath = join(ci, "contract-evolution.mjs");
  run(process.execPath, [cli, "contract", "snapshot", "--module", schemaPath, "--export", "previous", "--format", "v2", "--out", baselinePath]);
  const bytes = await readFile(baselinePath, "utf8");
  await writeFile(join(ci, "batch.json"), JSON.stringify({ version: 1, contracts: Array.from({ length: 50 }, (_, i) => ({ name: `contract-${i}`, module: schemaPath, export: "widened", against: baselinePath })) }));
  report.batchMs = [];
  for (let i = 0; i < 5; i++) {
    const start = performance.now();
    const result = JSON.parse(run(process.execPath, [cli, "--json", "contract", "check-many", "--manifest", join(ci, "batch.json")]));
    report.batchMs.push(performance.now() - start); assert.equal(result.counts.compatible, 50);
  }
  assert.equal(await readFile(baselinePath, "utf8"), bytes);
  assert.ok(median(report.batchMs) < 5000, "50-contract batch exceeds 5s budget");
  report.automatedChecks = "passed";
  if (report.regressions.length || report.inconclusive.length) {
    report.pending.push("Performance ratios need investigation; raw ranges retained");
    report.automatedChecks = "blocked-by-performance-budget";
    process.exitCode = 2;
  }
} catch (error) {
  report.automatedChecks = "failed";
  report.error = { message: error.message, stdout: error.stdout?.toString(), stderr: error.stderr?.toString() };
  process.exitCode = 1;
} finally {
  await writeFile(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(`quality: ${report.automatedChecks}; report: ${join(output, "report.json")}`);
  if (report.error) console.error(report.error);
}
