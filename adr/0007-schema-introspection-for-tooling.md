# ADR 0007: Schema Introspection for Tooling

## Context

SafeShape packages such as `@safe-shape/json-schema` need to inspect schemas without
reaching into private implementation fields.

Core schemas currently expose parsing behavior but no structured description.

## Decision

Core exposes schema introspection through `describeSchema(schema)`.

The description model is SafeShape-specific and does not mention JSON Schema.

Exporter packages depend on this neutral description model and convert it into their
target format.

## Consequences

Core remains independent from JSON Schema and other exporter formats.

Exporter packages do not depend on private implementation details.

New public schema builders must update the introspection model and tests.
