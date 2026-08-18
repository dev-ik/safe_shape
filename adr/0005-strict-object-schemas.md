# ADR 0005: Strict Object Schemas

## Status

Accepted and retained for SafeShape 2.0.

## Context

SafeShape validates external data at application boundaries. Object schemas must define
how to handle input properties that are not present in the schema shape.

## Decision

Object schemas are strict by default in v0.1.

If an input object contains a property that is not defined in the schema shape, validation
fails with an `unexpected_property` issue.

## Consequences

The runtime output matches the inferred TypeScript object type more closely because
additional input properties are rejected instead of silently accepted or stripped.

Permissive object behavior can be added later through an explicit public API.
