import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import test from "node:test";

const fixture = resolve("tests/fixtures/api-catalog.mjs");
const cli = resolve("dist/cli.js");
function run(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => execFile(process.execPath, [cli, "--json", ...args], (error, stdout, stderr) => resolve({ code: error ? Number((error as unknown as { code: number }).code) : 0, stdout, stderr })));
}

test("API CLI exports OpenAPI and snapshots, checks server updates without changing baseline", async () => {
  const dir = await mkdtemp(join(tmpdir(), "safe-shape-api-"));
  try {
    const baseline = join(dir, "api.json");
    const exported = await run(["api", "export", "--module", fixture, "--title", "Users", "--version", "1"]);
    assert.equal(exported.code, 0);
    assert.equal(JSON.parse(exported.stdout).document.openapi, "3.1.0");
    const snapshot = await run(["api", "snapshot", "--module", fixture, "--out", baseline]);
    assert.equal(snapshot.code, 0);
    const original = await readFile(baseline, "utf8");
    const safe = await run(["api", "check", "--module", fixture, "--against", baseline]);
    assert.equal(safe.code, 0);
    assert.equal(JSON.parse(safe.stdout).report.decision, "compatible");
    const breaking = await run(["api", "check", "--module", fixture, "--export", "breaking", "--against", baseline]);
    assert.equal(breaking.code, 2);
    assert.equal(JSON.parse(breaking.stdout).ok, true);
    assert.equal(JSON.parse(breaking.stdout).report.decision, "migration-required");
    assert.equal(await readFile(baseline, "utf8"), original);
    const overwrite = await run(["api", "check", "--module", fixture, "--against", baseline, "--out", baseline]);
    assert.equal(overwrite.code, 1);
    assert.equal(await readFile(baseline, "utf8"), original);
    await writeFile(baseline, '{"format":"invalid"}');
    const invalid = await run(["api", "check", "--module", fixture, "--against", baseline]);
    assert.equal(invalid.code, 1);
    assert.equal(JSON.parse(invalid.stderr).error.code, "api_command_failed");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("API export fails atomically with structured issues for opaque schemas", async () => {
  const dir = await mkdtemp(join(tmpdir(), "safe-shape-openapi-"));
  try {
    const path = join(dir, "openapi.json");
    await writeFile(path, "existing artifact");
    const result = await run(["api", "export", "--module", fixture, "--export", "refined", "--title", "Users", "--version", "1", "--out", path]);
    assert.equal(result.code, 1);
    const payload = JSON.parse(result.stderr);
    assert.equal(payload.error.code, "openapi_export_failed");
    assert.equal(payload.error.issues[0].cause.code, "json_schema.refinement.unrepresentable");
    assert.equal(await readFile(path, "utf8"), "existing artifact");
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("API commands reject missing flags, invalid exports and unknown flags", async () => {
  for (const args of [
    ["api", "snapshot"],
    ["api", "export", "--module", fixture, "--title", "Users"],
    ["api", "snapshot", "--module", fixture, "--export", "absent"],
    ["api", "snapshot", "--module", fixture, "--side", "output"],
  ]) {
    const result = await run(args);
    assert.equal(result.code, 1);
    assert.equal(JSON.parse(result.stderr).ok, false);
  }
});
