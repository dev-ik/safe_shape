import { performance } from "node:perf_hooks";

export function runCase(benchmarkCase) {
  for (let index = 0; index < Math.min(10_000, benchmarkCase.iterations); index += 1) {
    checkOutcome(benchmarkCase.run(), benchmarkCase);
  }

  let successes = 0;
  let failures = 0;
  const startedAt = performance.now();

  for (let index = 0; index < benchmarkCase.iterations; index += 1) {
    const result = benchmarkCase.run();
    const accepted = checkOutcome(result, benchmarkCase);
    if (accepted) {
      successes += 1;
    } else {
      failures += 1;
    }
  }

  const durationMs = performance.now() - startedAt;
  const opsPerSecond = benchmarkCase.iterations / (durationMs / 1000);

  if (!Number.isFinite(opsPerSecond) || opsPerSecond <= 0) {
    throw new Error(`Invalid benchmark result for ${benchmarkCase.name}`);
  }

  return Object.freeze({
    name: benchmarkCase.name,
    iterations: benchmarkCase.iterations,
    duration_ms: Number(durationMs.toFixed(3)),
    ops_per_second: Number(opsPerSecond.toFixed(3)),
    successes,
    failures,
  });
}

function checkOutcome(result, benchmarkCase) {
  const expected = benchmarkCase.expectedSuccess ?? true;
  const actual = benchmarkCase.accept ? benchmarkCase.accept(result) : result?.success;
  if (actual !== expected) {
    throw new Error(`Unexpected benchmark outcome for ${benchmarkCase.name}: expected ${expected}, received ${actual}`);
  }
  return actual;
}
