# ADR 0006: HTTP as Separate Package

## Context

SafeShape core defines runtime schemas, parsing, results, errors, and diagnostics.
HTTP boundary helpers depend on core schemas but should not make core depend on HTTP
concepts or framework-specific request objects.

## Decision

HTTP helpers live in a separate `@safe-shape/http` package.

The HTTP package depends on `@safe-shape/core`.

The core package does not depend on `@safe-shape/http`.

## Consequences

Core remains framework-neutral and can be used without HTTP helpers.

HTTP helpers can evolve independently while preserving the core runtime contract API.
