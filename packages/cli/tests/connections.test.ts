import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import test from "node:test";
import { object, string, number, enumeration } from "@safe-shape/core";
import { createContractSnapshotV2 } from "@safe-shape/compat";

const run = (args: string[]) => spawnSync(process.execPath, [resolve("dist/cli.js"), ...args], { encoding: "utf8" });

test("connection CLI preserves baselines and aggregates safe, breaking, unknown and errors", async () => {
  await mkdir(resolve(".tmp"), { recursive: true });
  const dir = await mkdtemp(resolve(".tmp/connections-"));
  try {
    const schemas = { producer: object({ state: enumeration(["a", "b"]) }), old: object({ state: enumeration(["a"]) }), opaque: string().transform(Number), consumer: number() };
    const original = new Map<string, string>();
    for (const [name, schema] of Object.entries(schemas)) {
      const source = JSON.stringify(createContractSnapshotV2(schema, { id: name }));
      original.set(name, source);
      await writeFile(join(dir, `${name}.json`), source);
    }
    const manifest = join(dir, "connections.json");
    const entries = [
      { name: "safe", producer: "old.json", consumer: "producer.json" },
      { name: "breaking", producer: "producer.json", consumer: "old.json" },
      { name: "unknown", producer: "opaque.json", consumer: "consumer.json" },
      { name: "error", producer: "missing.json", consumer: "old.json" },
    ];
    for (const [count, expected] of [[1, 0], [2, 2], [3, 2], [4, 1]]) {
      await writeFile(manifest, JSON.stringify({ version: 1, connections: entries.slice(0, count) }));
      const result = run(["--json", "contract", "check-connections", "--manifest", manifest]);
      assert.equal(result.status, expected, result.stderr);
      assert.equal(result.stderr, "");
      assert.equal(JSON.parse(result.stdout).results.length, count);
    }
    const text = run(["contract", "check-connections", "--manifest", manifest]);
    assert.equal(text.status, 1);
    assert.equal(text.stderr, "");
    assert.match(text.stdout, /safe: compatible \(old output -> producer input\)/);
    assert.match(text.stdout, /breaking: migration-required \(producer output -> old input\)/);
    assert.match(text.stdout, /input\.state \[enum.values.changed\]: Target contract rejects/);
    assert.match(text.stdout, /Keep every source enum value accepted/);
    assert.match(text.stdout, /Producer input: \{"state":"b"\}/);
    assert.match(text.stdout, /Emitted value rejected by consumer: \{"state":"b"\}/);
    assert.match(text.stdout, /unknown: manual-review/);
    assert.match(text.stdout, /Counterexample unavailable: unsupported-production/);
    assert.match(text.stdout, /error: error:/);
    for (const [name, content] of original) assert.equal(await readFile(join(dir, `${name}.json`), "utf8"), content);
    await writeFile(manifest, JSON.stringify({ version: 1, connections: [entries[0], entries[0]] }));
    assert.equal(run(["--json", "contract", "check-connections", "--manifest", manifest]).status, 1);
    assert.equal(run(["contract", "check-connections", "--manifest", manifest, "--out", join(dir, "old.json")]).status, 1);
    assert.equal(await readFile(join(dir, "old.json"), "utf8"), original.get("old"));
  } finally { await rm(dir, { recursive: true, force: true }); }
});

test("schema types CLI supports recursive graphs and rejects invalid sides before imports", async () => {
  await mkdir(resolve(".tmp"), { recursive: true });
  const dir = await mkdtemp(resolve(".tmp/type-graph-"));
  try {
    const module = join(dir, "schema.mjs");
    await writeFile(module, `import { string, number } from "@safe-shape/core"; export default string().transform(Number).pipe(number());`);
    for (const [side, expected] of [["input", "string"], ["output", "number"]]) {
      const result = run(["--json", "schema", "types", "--module", module, "--side", side!]);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).source, `export type SchemaOutput = ${expected};\n`);
    }
    await writeFile(module, 'console.log("EXECUTED");');
    const result = run(["--json", "schema", "types", "--module", module, "--side", "invalid"]);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
  } finally { await rm(dir, { recursive: true, force: true }); }
});
