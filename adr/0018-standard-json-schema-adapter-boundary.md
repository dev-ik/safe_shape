# ADR 0018: keep Standard JSON Schema conversion in the exporter package

## Status

Accepted.

## Context

Putting `jsonSchema` directly on every core schema would require moving JSON
Schema conversion into core or introducing a mutable global registry. The
first breaks package direction; the second introduces hidden initialization
order and conflicts with immutable schemas.

## Decision

`@safe-shape/json-schema` owns `createStandardJsonSchema(schema)`. It returns a
small frozen protocol entity whose `~standard` properties combine the schema's
native Standard Schema validator with side-aware JSON Schema converter
functions.

The adapter delegates to the existing public exporter rather than duplicating
Contract IR traversal. Unsupported targets and opaque outputs fail explicitly.
Core remains unaware of JSON Schema and gains no dependency.

## Consequences

Standard JSON Schema consumers receive a structurally compatible entity after
one explicit adaptation step. Validation and type inference remain available
on that same entity. The original SafeShape schema does not claim JSON Schema
capability by itself, making package installation and unsupported behavior
visible rather than magical.
