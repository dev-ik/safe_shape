# Benchmarks

Run the release benchmark smoke suite:

```sh
npm run build
npm run benchmarks:check
```

The runner measures representative SafeShape parse paths and writes a JSON
report to `.tmp/benchmarks/report.json`.

See [docs/benchmarks.md](../docs/benchmarks.md) for the release policy.

Contract-evolution coverage also measures recursive v2 snapshot creation and
migration projection from a precomputed breaking report. The recursive fixture
has one reusable definition with `name` and recursive `children` fields; the
migration fixture narrows one field in a two-property object. Snapshot and
projection cases use 10,000 and 20,000 measured iterations respectively, with
up to 10,000 warmup iterations. The report records runtime, architecture,
iterations, durations, and outcomes. These are smoke measurements, not a Zod
comparison or a statistically established regression threshold.

The benchmark gate first runs `runner.test.mjs`. Every warmup and measured
operation must match its declared outcome: valid parsing must succeed, invalid
parsing must fail, and compatibility/projection predicates must hold. Unexpected
results stop the run with an error instead of producing a misleading timing
report. Expected-invalid cases retain their `failures` counters; those counters
are not benchmark failures. Outcome checks add measurement overhead, so compare
performance using the same runner revision.
## Scalar counterexample budget

The scalar counterexample case performs 10,000 validated v2 snapshot searches
after warmup. Every result must be the expected numeric witness. Its predeclared
budget is 5 seconds for the measured calls; exceeding that budget fails the
benchmark gate. This is a bounded fixture guard, not a general latency claim.
The string-length counterexample fixture has the same separate budget and
asserts the expected `aa` witness on every invocation.
The finite composite fixture checks 1,000 complete nested-object witnesses
within a separate predeclared 5-second budget.

## Composition and connection budgets

The connection fixture checks 1,000 producer/consumer pairs, and the checked
pipeline fixture parses 10,000 values. Each has its own predeclared five-second
budget and validates outcomes. These guards do not replace the separate matched
baseline and SafeShape/Zod measurements in the quality harness.
