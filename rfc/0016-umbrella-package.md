# RFC 0016: umbrella package

## Status

Accepted and retained for SafeShape 2.0.

## Motivation

Some projects should be able to install SafeShape with one package:

```sh
npm install safe-shape
```

The scoped packages remain useful for narrow dependency surfaces, but the common
consumer path should not require learning every package name before first use.

## Proposal

Add a public `safe-shape` package that re-exports the stable public APIs from:

- `@safe-shape/core`
- `@safe-shape/http`
- `@safe-shape/json-schema`
- `@safe-shape/typescript`
- `@safe-shape/validation`

The package depends on `@safe-shape/cli`, which provides the `safe-shape` CLI
binary.

The repository root package is renamed to an internal workspace manifest name so
the public `safe-shape` npm package name can be used by the umbrella package.

## Alternatives

- Keep only scoped packages. This keeps dependency surfaces narrow but weakens
  first-run ergonomics.
- Publish the repository root as `safe-shape`. This is rejected because the root
  manifest owns workspace orchestration and should not be a consumer package.

## Migration

No migration is required. The package is additive. Existing scoped package
imports remain supported.
