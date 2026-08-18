# ADR 0020: keep artifact identity separate from runtime schema identity

## Status

Accepted.

## Context

A runtime schema may be exported into several documents with different public
locations. Storing a JSON Schema `$id` on the core schema would couple runtime
contracts to one artifact deployment URI and introduce an exporter concern
into core.

## Decision

Root `$id` is an export option owned by `@safe-shape/json-schema`. Stable lazy
ids remain semantic definition keys in Contract IR; they are not promoted to
network or document identifiers. The exporter combines the selected artifact
id with dialect-specific internal references.

The Standard JSON Schema adapter receives the same value through its
vendor-specific `libraryOptions`. The CLI forwards `schema export --id` to the
exporter without interpreting it.

## Consequences

One immutable runtime schema can produce multiple identified artifacts without
mutation. Core remains independent of JSON Schema. Reuse stays explicit and
deterministic, and no schema registry or hidden object-identity cache is
introduced.
