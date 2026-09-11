import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import test from "node:test";

const cli = resolve("dist/cli.js");
function run(args: string[]) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
  if (result.error) throw result.error;
  return result;
}
async function fixture() {
  await mkdir(resolve(".tmp"), { recursive: true });
  const directory = await mkdtemp(resolve(".tmp/batch-"));
  const module = join(directory, "schema.mjs");
  await writeFile(module, `import { string } from "@safe-shape/core";
export default string({ minLength: 2 });
export const widened = string({ minLength: 1 });
export const narrowed = string({ minLength: 3 });
export const opaque = string().refine(() => true, { id: "opaque/v1" });`);
  const baseline = join(directory, "baseline.json");
  const snapshot = run(["contract", "snapshot", "--module", module, "--format", "v2", "--out", baseline]);
  assert.equal(snapshot.status, 0, snapshot.stderr);
  const entry = { name: "safe", module: "./schema.mjs", against: "./baseline.json", export: "widened" };
  const manifest = join(directory, "checks.json");
  return { directory, baseline, manifest, entry };
}

test("Markdown review preserves mixed decisions, HTTP roles, errors and baselines", async () => {
  const f = await fixture();
  try {
    const original = await readFile(f.baseline, "utf8");
    await writeFile(f.manifest, JSON.stringify({ version: 1, contracts: [
      { ...f.entry, name: "safe" },
      { ...f.entry, name: "breaking", export: "narrowed", exchange: "request" },
      { ...f.entry, name: "review", export: "opaque" },
      { ...f.entry, name: "missing", export: "missing" },
    ] }));
    const args = ["contract", "check-many", "--manifest", f.manifest, "--counterexamples"];
    const json = run(["--json", ...args]);
    const markdown = run(["--markdown", ...args]);
    assert.equal(markdown.status, json.status);
    assert.equal(markdown.status, 1);
    assert.equal(markdown.stderr, "");
    assert.match(markdown.stdout, /^# Contract review\n/);
    assert.ok(markdown.stdout.includes("migration\\-required"));
    assert.ok(markdown.stdout.includes("manual\\-review"));
    assert.ok(markdown.stdout.includes("Operational error:"));
    assert.ok(markdown.stdout.includes("Affected role: server consumer"));
    assert.ok(markdown.stdout.includes('```json\n"aa"\n```'));
    assert.ok(markdown.stdout.includes("Suggested action:"));
    assert.ok(markdown.stdout.includes("Previous fingerprint:"));
    const single = run(["--markdown", "contract", "check", "--module", join(f.directory, "schema.mjs"),
      "--export", "narrowed", "--against", f.baseline, "--counterexamples"]);
    assert.equal(single.status, 2);
    assert.equal(single.stderr, "");
    assert.ok(single.stdout.includes('```json\n"aa"\n```'));
    assert.equal(await readFile(f.baseline, "utf8"), original);
  } finally { await rm(f.directory, { recursive: true, force: true }); }
});

test("invalid Markdown combinations fail before loading schema code", async () => {
  const f = await fixture();
  try {
    const module = join(f.directory, "schema.mjs");
    await writeFile(module, 'console.log("IMPORTED"); throw new Error("should not run");');
    const args = ["--markdown", "contract", "check", "--module", module, "--against", f.baseline];
    for (const flags of [["--json"], ["--out", f.baseline]]) {
      const result = run([...args, ...flags]);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.ok(!result.stderr.includes("IMPORTED"));
    }
    assert.equal(run(["--markdown", "doctor"]).status, 1);
  } finally { await rm(f.directory, { recursive: true, force: true }); }
});

test("counterexamples are opt-in for single and batch checks without changing decisions or baselines", async () => {
  const f = await fixture();
  try {
    const original = await readFile(f.baseline, "utf8");
    await writeFile(f.manifest, JSON.stringify({ version: 1, contracts: [f.entry] }));
    for (const args of [
      ["contract", "check", "--module", join(f.directory, "schema.mjs"), "--export", "widened", "--against", f.baseline],
      ["contract", "check-many", "--manifest", f.manifest],
    ]) {
      const plain = run(["--json", ...args]);
      const opted = run(["--json", ...args, "--counterexamples"]);
      assert.equal(opted.status, plain.status);
      assert.equal(opted.stderr, "");
      const a = JSON.parse(plain.stdout);
      const b = JSON.parse(opted.stdout);
      const entry = b.results ? b.results[0] : b;
      assert.equal(entry.counterexamples[0].reason, "no-witness-found");
      delete entry.counterexamples;
      assert.deepEqual(b, a);
      assert.deepEqual(JSON.parse(run(["--json", ...args, "--counterexamples=false"]).stdout), a);
      assert.match(run([...args, "--counterexamples"]).stdout, /Counterexample.*unavailable/);
    }
    assert.equal(await readFile(f.baseline, "utf8"), original);
  } finally { await rm(f.directory, { recursive: true, force: true }); }
});

test("string witnesses reach single and batch CLI reports", async () => {
  const f = await fixture();
  try {
    const original = await readFile(f.baseline, "utf8");
    await writeFile(f.manifest, JSON.stringify({ version: 1, contracts: [{ ...f.entry, export: "narrowed" }] }));
    for (const args of [
      ["contract", "check", "--module", join(f.directory, "schema.mjs"), "--export", "narrowed", "--against", f.baseline],
      ["contract", "check-many", "--manifest", f.manifest],
    ]) {
      const result = run(["--json", ...args, "--counterexamples"]);
      assert.equal(result.status, 2, result.stderr);
      assert.equal(result.stderr, "");
      const payload = JSON.parse(result.stdout);
      assert.equal((payload.results?.[0] ?? payload).counterexamples[0].value, "aa");
    }
    assert.equal(await readFile(f.baseline, "utf8"), original);
  } finally { await rm(f.directory, { recursive: true, force: true }); }
});

test("batches mixed decisions with role output and preserves baselines", async () => {
  const f = await fixture();
  try {
    const before = await readFile(f.baseline, "utf8");
    await writeFile(f.manifest, JSON.stringify({ version: 1, contracts: [
      f.entry,
      { ...f.entry, name: "break", export: "narrowed", exchange: "request" },
      { ...f.entry, name: "review", export: "opaque", side: "output" },
      { ...f.entry, name: "response", compatibility: "forward", exchange: "response" },
    ] }));
    const result = run(["--json", "contract", "check-many", "--manifest", f.manifest]);
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stderr, "");
    const report = JSON.parse(result.stdout);
    assert.equal(report.ok, false);
    assert.equal(report.command, "contract check-many");
    assert.deepEqual(report.counts, { total: 4, compatible: 1, migrationRequired: 2, manualReviewRequired: 1, errors: 0 });
    assert.deepEqual(report.results.map((item: { name: string }) => item.name), ["safe", "break", "review", "response"]);
    assert.equal(report.results[0].module, join(f.directory, "schema.mjs"));
    assert.equal(report.results[1].http.consumer, "server");
    assert.equal(report.results[2].side, "output");
    assert.equal(report.results[3].http.producer, "server");
    assert.equal(report.results[1].migration.decision, "migration-required");
    const text = run(["contract", "check-many", "--manifest", f.manifest]);
    assert.equal(text.status, 2);
    assert.match(text.stdout, /server consumer/);
    assert.match(text.stdout, /Suggestion:/);
    assert.match(text.stdout, /manual review: 1/);
    assert.equal(await readFile(f.baseline, "utf8"), before);
  } finally { await rm(f.directory, { recursive: true, force: true }); }
});

test("batch operational errors take precedence and do not hide later results", async () => {
  const f = await fixture();
  try {
    const legacy = join(f.directory, "legacy.json");
    assert.equal(run(["contract", "snapshot", "--module", join(f.directory, "schema.mjs"), "--out", legacy]).status, 0);
    await writeFile(f.manifest, JSON.stringify({ version: 1, contracts: [
      { ...f.entry, name: "missing", export: "missing" },
      { ...f.entry, name: "legacy", against: "legacy.json", side: "input" },
      { ...f.entry, name: "break", export: "narrowed" },
      f.entry,
    ] }));
    const result = run(["--json", "contract", "check-many", "--manifest", f.manifest]);
    assert.equal(result.status, 1);
    assert.equal(result.stderr, "");
    const report = JSON.parse(result.stdout);
    assert.equal(report.counts.errors, 2);
    assert.equal(report.results[0].error.code, "missing_export");
    assert.equal(report.results[1].error.code, "invalid_contract_side");
    assert.equal(report.results[3].status, "safe");
    assert.equal(report.results[0].status, undefined);
    await writeFile(f.manifest, JSON.stringify({ version: 1, contracts: [f.entry, { name: "default", module: f.entry.module, against: "legacy.json" }] }));
    assert.equal(run(["--json", "contract", "check-many", "--manifest", f.manifest]).status, 0);
  } finally { await rm(f.directory, { recursive: true, force: true }); }
});

test("validates entire manifest before loading trusted schema modules", async () => {
  const f = await fixture();
  try {
    // Any import would emit stdout and fail the no-partial-output assertion.
    await writeFile(join(f.directory, "schema.mjs"), 'console.log("IMPORTED"); throw new Error("must not import");');
    const badEntries = [
      { ...f.entry, name: "" }, { ...f.entry, side: "both" },
      { ...f.entry, compatibility: "reverse" }, { ...f.entry, exchange: "stream" },
      { ...f.entry, export: null }, { ...f.entry, module: 42 },
      { ...f.entry, against: " " }, { ...f.entry, typo: true }, null,
    ];
    const manifests: unknown[] = [null, [], { version: 2, contracts: [f.entry] },
      { version: 1, contracts: [] }, { version: 1, contracts: [f.entry], extra: true },
      { version: 1, contracts: [f.entry, f.entry] },
      ...badEntries.map((entry) => ({ version: 1, contracts: [f.entry, entry] })),
    ];
    for (const manifest of manifests) {
      await writeFile(f.manifest, JSON.stringify(manifest));
      const result = run(["--json", "contract", "check-many", "--manifest", f.manifest]);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.equal(JSON.parse(result.stderr).error.code, "invalid_contract_manifest");
    }
    await writeFile(f.manifest, "{");
    const malformed = run(["--json", "contract", "check-many", "--manifest", f.manifest]);
    assert.equal(JSON.parse(malformed.stderr).error.code, "invalid_contract_manifest");
    assert.equal(malformed.stdout, "");
  } finally { await rm(f.directory, { recursive: true, force: true }); }
});

test("check-many rejects missing manifest and unsupported flags", () => {
  const missing = run(["--json", "contract", "check-many"]);
  assert.equal(missing.status, 1);
  assert.equal(JSON.parse(missing.stderr).error.code, "missing_flag");
  const invalid = run(["--json", "contract", "check-many", "--out", "ignored.json"]);
  assert.equal(invalid.status, 1);
  assert.equal(JSON.parse(invalid.stderr).error.code, "invalid_flag");
});
