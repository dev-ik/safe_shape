# Benchmarks

SafeShape `1.0.0` includes a dependency-free benchmark smoke suite.

Run:

```sh
npm run build
npm run benchmarks:check
```

The benchmark runner measures representative SafeShape parse paths and writes a
JSON report to `.tmp/benchmarks/report.json`.

The release check treats benchmarks as execution evidence, not as a fixed
performance threshold. This avoids unstable CI failures while still proving that
the benchmark suite runs against the built release artifacts.
