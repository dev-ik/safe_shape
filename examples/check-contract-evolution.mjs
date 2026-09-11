import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { explainChange, narrowed, opaque, widened, previousAmount, nextAmount, previousName, nextName, previousPayload, nextPayload } from "./contract-evolution.mjs";
import { createContractCounterexamples, createContractSnapshotV2, compareContractsV2,
  createMigrationDiagnostics, createHttpCompatibilityPresentation } from "safe-shape";

// Pass the workspace CLI path, or use the installed consumer binary by default.
const cli = resolve(process.argv[2] ?? "node_modules/.bin/safe-shape");
const modulePath = join(dirname(fileURLToPath(import.meta.url)), "contract-evolution.mjs");
const directory = await mkdtemp(join(tmpdir(), "safe-shape-evolution-"));
const baseline = join(directory, "node.contract.json");
function run(args, json = true) {
  const result = spawnSync(process.execPath, [cli, ...(json ? ["--json"] : []), "contract", ...args], { encoding: "utf8" });
  if (result.error) throw result.error;
  return result;
}

try {
  for (const [name, previousExport, nextExport, previousScalar, nextScalar] of [
    ["amount", "previousAmount", "nextAmount", previousAmount, nextAmount],
    ["name", "previousName", "nextName", previousName, nextName],
    ["payload", "previousPayload", "nextPayload", previousPayload, nextPayload],
  ]) {
    const scalarBaseline = join(directory, `${name}.contract.json`);
    assert.equal(run(["snapshot", "--module", modulePath, "--export", previousExport, "--format", "v2", "--out", scalarBaseline]).status, 0);
    const scalarBytes = await readFile(scalarBaseline, "utf8");
    const scalarReport = compareContractsV2(previousScalar, nextScalar);
    assert.equal(createMigrationDiagnostics(scalarReport).decision, "migration-required");
    assert.equal(createHttpCompatibilityPresentation(scalarReport, { exchange: "request" }).consumer, "server");
    const witnesses = createContractCounterexamples(createContractSnapshotV2(previousScalar), createContractSnapshotV2(nextScalar));
    assert.equal(witnesses[0].status, "available");
    assert.equal(previousScalar.safeParse(witnesses[0].value).success, true);
    assert.equal(nextScalar.safeParse(witnesses[0].value).success, false);
    const scalarManifest = join(directory, `${name}-checks.json`);
    await writeFile(scalarManifest, JSON.stringify({ version: 1, contracts: [
      { name, module: modulePath, export: nextExport, against: scalarBaseline, exchange: "request" },
    ] }));
    for (const args of [
      ["check", "--module", modulePath, "--export", nextExport, "--against", scalarBaseline],
      ["check-many", "--manifest", scalarManifest],
    ]) {
      const result = run([...args, "--counterexamples"]);
      assert.equal(result.status, 2, result.stderr);
      assert.equal(result.stderr, "");
      const payload = JSON.parse(result.stdout);
      assert.deepEqual((payload.results?.[0] ?? payload).counterexamples, witnesses);
      const markdown = run([...args, "--counterexamples", "--markdown"], false);
      assert.equal(markdown.status, result.status, markdown.stderr);
      assert.equal(markdown.stderr, "");
      assert.match(markdown.stdout, /^# Contract review/);
      assert.ok(markdown.stdout.includes(JSON.stringify(witnesses[0].value, null, 2)));
    }
    const unavailable = run(["check", "--module", modulePath, "--export", nextExport, "--against", scalarBaseline, "--side", "output", "--counterexamples"]);
    assert.equal(JSON.parse(unavailable.stdout).counterexamples[0].reason, "unsupported-side");
    assert.equal(await readFile(scalarBaseline, "utf8"), scalarBytes);
  }
  const snapshot = run(["snapshot", "--module", modulePath, "--export", "previous", "--id", "node", "--format", "v2", "--out", baseline]);
  assert.equal(snapshot.status, 0, snapshot.stderr);
  assert.equal(snapshot.stderr, "");
  const original = await readFile(baseline, "utf8");
  for (const side of ["input", "output"]) {
    for (const [name, status, decision, code] of [
      ["widened", "safe", "compatible", 0],
      ["narrowed", "breaking", "migration-required", 2],
      ["opaque", "unknown", "manual-review", 2],
    ]) {
      const result = run(["check", "--module", modulePath, "--export", name, "--against", baseline, "--side", side]);
      assert.equal(result.status, code, result.stderr);
      assert.equal(result.stderr, "");
      const payload = JSON.parse(result.stdout);
      assert.equal(payload.status, status);
      assert.equal(payload.migration.decision, decision);
      assert.equal(payload.side, side);
      assert.equal(payload.format, "safe-shape.contract/v2");
      assert.equal(await readFile(baseline, "utf8"), original);
    }
  }
  const error = run(["check", "--module", modulePath, "--export", "missing", "--against", baseline]);
  assert.equal(error.status, 1);
  assert.equal(error.stdout, "");
  assert.equal(JSON.parse(error.stderr).error.code, "missing_export");
  assert.equal(await readFile(baseline, "utf8"), original);

  for (const exchange of ["request", "response"]) {
    for (const compatibility of ["backward", "forward", "full"]) {
      for (const [next, decision] of [
        [compatibility === "forward" ? widened : narrowed, "migration-required"],
        [opaque, "manual-review"],
      ]) {
        const explanation = explainChange(next, { exchange, compatibility });
        assert.equal(explanation.migration.decision, decision);
        assert.equal(explanation.http.status, explanation.report.status);
        assert.ok(explanation.migration.diagnostics.length > 0);
        for (const diagnostic of explanation.migration.diagnostics) {
          assert.ok(diagnostic.message);
          assert.ok(diagnostic.suggestion);
        }
      }
    }
  }
  const manifest = join(directory, "checks.json");
  const checks = [
    { name: "request-safe", export: "widened", exchange: "request" },
    { name: "response-breaking", export: "widened", compatibility: "forward", exchange: "response", side: "output" },
    { name: "manual-review", export: "opaque" },
    { name: "operational-error", export: "missing" },
  ].map((entry) => ({ module: modulePath, against: "./node.contract.json", ...entry }));
  await writeFile(manifest, JSON.stringify({ version: 1, contracts: checks }));
  const batch = run(["check-many", "--manifest", manifest]);
  assert.equal(batch.status, 1);
  assert.equal(batch.stderr, "");
  const batchReport = JSON.parse(batch.stdout);
  assert.deepEqual(batchReport.counts, {
    total: 4, compatible: 1, migrationRequired: 1, manualReviewRequired: 1, errors: 1,
  });
  assert.equal(batchReport.results[1].http.producer, "server");
  assert.equal(batchReport.results[3].error.code, "missing_export");
  const review = run(["check-many", "--manifest", manifest, "--counterexamples", "--markdown"], false);
  assert.equal(review.status, 1);
  assert.equal(review.stderr, "");
  assert.ok(review.stdout.includes("Operational error:"));
  assert.ok(review.stdout.includes("manual\\-review"));
  assert.equal(await readFile(baseline, "utf8"), original);
  console.log("contract-evolution: ok (both graph sides; safe/breaking/unknown/error; baseline unchanged)");
} finally {
  await rm(directory, { recursive: true, force: true });
}
