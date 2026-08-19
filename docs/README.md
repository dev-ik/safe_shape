# SafeShape Documentation

**English** | [Русский](ru/README.md)

SafeShape documentation is organized by the task you need to complete.

## Start Here

- [Quick start](quick-start.md): install SafeShape, validate input, inspect
  diagnostics, and create a contract baseline.
- [Project integration](integration.md): package choices, TypeScript setup,
  Standard Schema, HTTP, CLI, and CI integration.
- [Production response recovery](production-response-recovery.md): report
  deployed response drift and degrade safely through validated fallbacks.
- [Migrating from 1.x to 2.0](migration-1-to-2.md): source-sensitive changes
  and the recommended upgrade order.

## API Reference

- [Umbrella package](api/safe-shape.md)
- [Core schemas and parsing](api/core.md)
- [Contract snapshots and compatibility](api/compat.md)
- [CLI](api/cli.md)
- [HTTP helpers](api/http.md)
- [JSON Schema](api/json-schema.md)
- [TypeScript generation](api/typescript.md)
- [Validation reports](api/validation.md)

## Concepts

- [Design principles](design-principles.md)
- [Validation model](validation-model.md)
- [Type system](type-system.md)
- [Diagnostics](diagnostics.md)
- [Error system](error-system.md)
- [Immutability](immutability.md)
- [Package architecture](package-architecture.md)
- [Compatibility rule matrix](compatibility-matrix.md)

## Operations and Project Development

- [Contract checks in CI](ci.md)
- [Release workflow](release.md)
- [Publish readiness](publish-readiness.md)
- [Benchmarks](benchmarks.md)
- [Testing](testing.md)
- [Performance](performance.md)
- [Roadmap](roadmap.md)

Architecture decisions live in [`adr/`](../adr/), and accepted public API
proposals live in [`rfc/`](../rfc/).

Return to the [project README](../README.md).
