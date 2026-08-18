# ADR 0012: contract compatibility package and canonical snapshot format

## Status

Accepted

## Context

Contract snapshots and compatibility analysis depend on core schema
descriptions, canonical serialization, hashing, and a growing set of evolution
rules. Putting those concerns in core would reverse the existing runtime-to-
tooling dependency direction and increase the core surface.

Serializing `SchemaDefinition` directly is also insufficient: definitions may
contain values that JSON cannot represent directly, metadata examples should
not be stored by default, and a public snapshot needs an independent format
version.

## Decision

Create `@safe-shape/compat` as a tooling package that depends only on
`@safe-shape/core`.

The package converts neutral core descriptions into a JSON-safe canonical
contract tree. The snapshot envelope uses its own explicit format string,
includes a user-visible contract identifier, and fingerprints the canonical
tree with SHA-256.

The package validates snapshots at the file boundary before comparing them. It
uses conservative accepted-value subset checks for compatibility and reports
unprovable opaque behavior as `unknown`.

The CLI depends on `@safe-shape/compat`; core does not depend on compat, CLI,
JSON Schema, or other tooling packages. The umbrella package re-exports compat.

## Consequences

- Snapshot files are stable public artifacts with an independently versioned
  compatibility policy.
- Compatibility rules can evolve without increasing core coupling.
- Node's standard cryptography implementation is part of the compat runtime;
  the package shares the workspace requirement of Node.js 20.10 or newer.
- A new workspace package must be included in release, consumer-install, and
  package-boundary checks.
- Anonymous transforms and refinements can block compatibility approval until
  callers assign stable semantic identifiers or remove the opaque behavior.
