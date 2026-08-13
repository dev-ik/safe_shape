# ADR 0008: TypeScript generation package

## Status

Accepted

## Context

The CLI can generate TypeScript declarations from schema modules, but that logic
is useful outside command-line workflows.

Keeping the generator inside the CLI would make package coupling worse and make
programmatic artifact generation harder.

## Decision

Create `@safe-shape/typescript` as a separate package built on
`@safe-shape/core` schema descriptions.

The CLI uses this package for `schema types`.

## Consequences

- Type generation becomes a reusable public API.
- The package remains loosely coupled because it depends only on core.
- Transform output types are conservative `unknown` until runtime metadata can
  represent mapper outputs honestly.
