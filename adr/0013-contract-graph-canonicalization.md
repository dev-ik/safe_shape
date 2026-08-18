# ADR 0013: canonicalize recursive contracts in core descriptions

## Status

Accepted.

## Context

Recursive contracts require a graph rather than a nested tree. JSON Schema,
snapshots, compatibility analysis, and future Standard JSON Schema adapters all
need the same stable reference identity. If each tooling package discovers and
orders the graph independently, their artifacts can disagree.

Core must remain neutral and must not depend on hashing, JSON Schema, CLI, or
compatibility packages.

## Decision

Core owns graph discovery and deterministic Contract IR ordering through
`describeContract()`.

- Explicit lazy ids define reusable graph nodes.
- Input and output graphs have independent roots and definition tables.
- Definition ids, object properties, required-property lists, and metadata are
  emitted in stable order.
- Core does not hash or serialize the graph.
- Tooling packages consume the canonical graph and own target-specific
  serialization, fingerprints, warnings, and compatibility policies.
- Duplicate ids from different lazy schema instances are rejected.

Contract snapshot v1 continues to use its existing tree representation. A
versioned snapshot migration is required before graph contracts enter stored
compatibility artifacts.

## Consequences

Artifact packages share reference identity and ordering without creating a
dependency from core to tooling. Recursive schemas become a core runtime and
introspection capability. Snapshot v1 cannot accept them, which is explicit and
safer than emitting an incomplete artifact.
