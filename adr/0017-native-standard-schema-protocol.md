# ADR 0017: implement the Standard Schema protocol in core

## Status

Accepted.

## Context

An external adapter would require consumers to know they are using SafeShape,
which defeats schema-agnostic interoperability. A dependency on the type-only
Standard Schema package would also add a core dependency without providing
runtime behavior.

## Decision

Define the permitted Standard Schema V1 structural types inside
`@safe-shape/core` and make the base schema class expose a frozen `~standard`
object. Its synchronous validator delegates to the existing `safeParse()`
path, so there is one validation implementation and one diagnostic source of
truth.

Native SafeShape issues are returned directly because they satisfy the
standard issue interface and retain strictly more immutable diagnostic data.
The runtime protocol omits the phantom `types` member while the declaration
surface carries input and output inference.

## Consequences

Every current and future schema combinator is interoperable automatically,
including transforms with distinct input and output types. Core gains a small
per-schema protocol object and validation closure, but no package dependency or
duplicated parser. Future Standard JSON Schema support can extend the same
protocol object in a separate reviewed slice.
