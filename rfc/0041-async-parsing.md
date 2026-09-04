# RFC 0041: explicit async parsing

## Status

Accepted for SafeShape 3.0.

## Motivation

Database-backed and service-backed semantic rules require asynchronous work.
SafeShape must support them without making synchronous parsing conditionally
return promises or changing deterministic ordering.

## Public API

Every schema adds `safeParseAsync(input)` and `parseAsync(input)`.
Schemas add explicit `refineAsync(predicate, options)` and
`refineAsyncWithDiagnostics(collector, { id })`. The warning equivalents are
`warnAsync()` and `warnAsyncWithDiagnostics()`. Synchronous APIs and callbacks
remain synchronous.

## Execution Model

Async checks run sequentially in declaration order. Nested container members
also run in existing deterministic order. This avoids observable races,
unbounded concurrency, and unstable diagnostic ordering. A future bounded
parallel API requires a separate RFC.

`safeParse()` and `parse()` throw a deterministic `TypeError` before executing
an async rule. They never return a promise. `safeParseAsync()` supports both
fully synchronous and async schemas and always returns a promise.

Rejected or thrown async callbacks become deterministic fatal custom issues
without exposing the rejection value. Async warning callback failures are also
fatal execution issues. Successful async warnings and errors use Diagnostics
v2 semantics.

## Contract Semantics

Async rules require a stable id. Contract IR records their ordered opaque
identity and whether they are error or warning rules. Matching stable ids can
be compared conservatively; changed or anonymous behavior is never assumed
compatible. JSON Schema export rejects async refinements rather than
approximating them.

The existing ordered Contract IR `refinements` field encodes these identities
as `async-error:<id>` and `async-warning:<id>`; synchronous warnings use
`warning:<id>`. Existing synchronous error ids retain their prior encoding.

## Boundary Propagation

Async variants are added explicitly to HTTP and validation helpers. CLI schema
validation uses async parsing so modules containing async rules work without a
second command. Standard Schema already permits a promise result and delegates
to async parsing when a schema contains async work.

## Compatibility

Existing synchronous schemas and entry points keep their behavior and
performance path. Async behavior is opt-in and never inferred from a callback
passed to a synchronous method.

## Non-Goals

- Conditional promise returns from synchronous APIs.
- Concurrent callback execution.
- Cancellation or timeout policy in core.
- Retrying application callbacks.
