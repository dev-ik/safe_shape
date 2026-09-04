# ADR 0028: explicit sequential async execution

## Status

Accepted.

## Context

SafeShape 3.0 introduces asynchronous semantic rules. Conditional promise
returns would break the runtime-first synchronous contract, while implicit
parallelism would make order and side effects unstable.

## Decision

Keep separate synchronous and asynchronous entry points. A schema records
whether its graph contains async work. Synchronous entry points reject such a
schema before running async callbacks. Async parsing runs checks and nested
members sequentially in the same order used by synchronous parsing.

Standard Schema may return a promise and therefore selects the async path only
for schemas containing async work. HTTP, validation, and CLI receive explicit
async propagation without changing package dependency direction.

## Consequences

- Existing synchronous behavior stays deterministic and fast.
- Async behavior has predictable ordering but does not maximize throughput.
- Applications own cancellation, timeout, retry, and concurrency policy.
- Contract IR and exporters must represent or reject async opaque behavior
  explicitly.
