# Benchmarks

SafeShape includes a dependency-free benchmark smoke suite.

Run:

```sh
npm run build
npm run benchmarks:check
```

The benchmark runner measures representative SafeShape parse paths and writes a
JSON report to `.tmp/benchmarks/report.json`.

The suite covers primitive and formatted strings, exact decimal multiples,
constrained record keys, strict/strip/passthrough objects, ordinary and
discriminated unions, ordinary-union failure branch collection, intersections,
Standard Schema validation, arrays, invalid input, and recursive parse paths.
Release-candidate coverage also measures safe widening and breaking narrowing
through the v1 compatibility pipeline, plus recursive widening through the v2
graph snapshot and compatibility pipeline. Compatibility cases assert their
expected status on every measured iteration, so a semantic regression fails the
scenario rather than producing a misleading throughput result.

The release check treats benchmarks as execution evidence, not as a fixed
performance threshold. This avoids unstable CI failures while still proving that
the benchmark suite runs against the built release artifacts.

## 2.0 Release Candidate Review

The 2026-08-18 RC run used Node.js `v20.10.0` on macOS arm64. The 15 existing
parse scenarios stayed between approximately `-8.2%` and `+4.4%` of the prior
recorded sample, with no order-of-magnitude or unexplained regression. The new
compatibility baselines were:

| Scenario | Throughput | Expected results |
| --- | ---: | ---: |
| Contract widening, v1 | 40,866 ops/sec | 20,000 `safe` |
| Contract narrowing, v1 | 41,065 ops/sec | 20,000 `breaking` |
| Recursive contract widening, v2 | 11,343 ops/sec | 10,000 `safe` |

Throughput is platform-sensitive. These values document the reviewed RC
baseline; semantic status assertions and successful execution remain the
portable release gate.
