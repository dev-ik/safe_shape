# Benchmarks

Run the release benchmark smoke suite:

```sh
npm run build
npm run benchmarks:check
```

The runner measures representative SafeShape parse paths and writes a JSON
report to `.tmp/benchmarks/report.json`.

See [docs/benchmarks.md](../docs/benchmarks.md) for the release policy.
