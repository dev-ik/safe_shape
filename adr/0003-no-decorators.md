# ADR 0003: no-decorators

## Status

Accepted and retained for SafeShape 2.0.

## Context

Decorator-based validation couples contracts to classes, compiler settings,
and emitted metadata. SafeShape also needs to describe primitives, unions,
tuples, and plain data that do not naturally belong to a class declaration.

## Decision

The public schema API uses explicit builder functions and combinators. Core does
not require decorators, reflection metadata, or class construction to define or
execute a contract.

## Consequences

Schemas work in JavaScript and TypeScript projects with ordinary ESM imports and
without decorator compiler configuration. Class-oriented applications define a
schema alongside the class or domain type. A future adapter may consume
SafeShape schemas, but decorators will not become a core requirement.
