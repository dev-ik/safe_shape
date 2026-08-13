# ADR 0011: umbrella package boundary

## Status

Accepted

## Context

SafeShape has multiple focused packages with explicit dependency direction.
Consumers also need a simple `npm install safe-shape` path.

Publishing the repository root would mix workspace orchestration with consumer
package concerns.

## Decision

Create `packages/safe-shape` as a normal workspace package named `safe-shape`.

The package depends on the scoped packages and re-exports their public APIs. It
does not define new schema semantics or private implementation access.

The repository root package name is reserved for workspace orchestration and is
not a public package.

## Consequences

- Consumers can install `safe-shape` for the complete surface.
- Consumers can still install scoped packages for narrower dependency surfaces.
- Release order publishes `safe-shape` after all scoped packages.
- Package-boundary checks must include both scoped packages and the umbrella
  package.
