# ADR 0001: runtime-first

## Status

Accepted and retained for SafeShape 2.0.

## Context

TypeScript types are erased at runtime, while application boundaries receive
untrusted values from JSON, HTTP, storage, and other external systems. A static
type annotation alone cannot establish that those values satisfy a contract.

## Decision

SafeShape schemas are executable runtime contracts and are the source of truth
for parsing behavior. Type inference and generated artifacts are derived from
the runtime schema. Core correctness does not depend on code generation,
decorators, or a TypeScript compiler plugin.

## Consequences

Boundary values must be parsed before they are treated as typed application
data. Runtime validation has an explicit execution cost, while inferred types
stay coupled to the behavior that actually accepts or rejects input. Tooling
requires a stable introspection model rather than a separate schema language.
