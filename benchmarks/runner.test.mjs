import assert from "node:assert/strict";
import test from "node:test";
import { runCase } from "./runner.mjs";

test("rejects unexpected valid, invalid, and compatibility outcomes", () => {
  for (const fixture of [
    { run: () => ({ success: false }) },
    { run: () => ({ success: true }), expectedSuccess: false },
    { run: () => ({ status: "breaking" }), accept: (result) => result.status === "safe" },
  ]) {
    assert.throws(() => runCase({ name: "incorrect fixture", iterations: 1, ...fixture }), /Unexpected benchmark outcome/);
  }
});
test("checks measured outcomes after warmup and preserves invalid counters", () => {
  let calls = 0;
  assert.throws(() => runCase({ name: "changes after warmup", iterations: 1,
    run: () => ({ success: ++calls === 1 }) }), /Unexpected benchmark outcome/);
  const result = runCase({ name: "expected invalid", iterations: 2,
    expectedSuccess: false, run: () => ({ success: false }) });
  assert.equal(result.successes, 0);
  assert.equal(result.failures, 2);
});
