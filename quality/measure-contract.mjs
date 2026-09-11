import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
const [coreUrl, compatUrl] = process.argv.slice(2);
const s = await import(coreUrl);
const c = await import(compatUrl);
function tree(minLength) { let node; node = s.lazy(() => s.object({ name: s.string({ minLength }), children: s.array(node) }), { id: "Node" }); return node; }
const previous = tree(2), next = tree(1);
const migration = c.compareContractsV2(next, previous);
const cases = [
  ["snapshot", () => c.createContractSnapshotV2(previous, { id: "node" }), (r) => r.format === "safe-shape.contract/v2"],
  ["comparison", () => c.compareContractsV2(previous, next), (r) => r.status === "safe"],
  ["migration", () => c.createMigrationDiagnostics(migration), (r) => r.decision === "migration-required"],
];
const results = {};
for (const [name, run, check] of cases) {
  for (let i = 0; i < 1000; i++) assert.ok(check(run()));
  const start = performance.now();
  for (let i = 0; i < 10000; i++) assert.ok(check(run()));
  results[name] = (performance.now() - start) / 10000;
}
console.log(JSON.stringify(results));
