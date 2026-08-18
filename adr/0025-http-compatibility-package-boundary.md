# ADR 0025: keep HTTP compatibility presentation in compat

## Status

Accepted.

## Context

`@safe-shape/http` is a small framework-neutral runtime boundary package that
depends only on core. Adding compatibility tooling there would make normal HTTP
validation installations depend on snapshot hashing and evolution policy.
Making `@safe-shape/compat` import the HTTP package would also couple the proof
engine to one transport abstraction.

The required feature is a presentation of an existing compatibility report,
not a new runtime HTTP contract model.

## Decision

Implement `createHttpCompatibilityPresentation()` in `@safe-shape/compat`.
The function accepts a structural compatibility report and one explicit
request/response exchange option. It maps directions to producer/consumer and
client/server terminology without importing `@safe-shape/http`.

`@safe-shape/http` documents the optional integration but retains its existing
core-only dependency. The original report remains the source of proof data;
the presentation does not reinterpret status or compatibility.

## Consequences

- Runtime HTTP users do not pay for compatibility tooling.
- Compat remains transport-independent at the proof layer.
- Request/response terminology is stable and machine-readable.
- Future endpoint catalogs can aggregate these presentations without changing
  the low-level report model.
