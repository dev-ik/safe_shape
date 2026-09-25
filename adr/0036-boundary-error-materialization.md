# ADR 0036: Materialize validation errors at the public parse boundary

## Status

Accepted

## Context

Invalid nested parses currently allocate a native ValidationError at every failed
layer. Each parent reads only issues and warnings before creating another error.
The 3.2 candidate investigation identified stack capture as a significant cost.
Runtime-first diagnostics and public API stability must survive optimization.

## Decision

Private schema traversal carries a discriminated result containing diagnostics.
It creates no Error. Public safeParse/safeParseAsync materialize one ordinary
ValidationError per failed call; parse/parseAsync throw that error as before.
Public failure(), frozen results, issues, warnings, branch ordering and eager
error access remain unchanged. The stack is captured at the public boundary;
internal traversal frame names are not a stable API. No global Error settings,
lazy public getters, logging side effects or environment-based policy are added.

Standard Schema continues through the public parse boundary. HTTP sections remain
independent core calls, preserving the one-way http -> core dependency.

## Verification

Check synchronous/asynchronous diagnostic equivalence, recursive union branches,
warning ordering, concurrent calls, public Error identity, message and stack.
Measure acceptance-only failures, full recursive issue consumption and formatted
diagnostics separately, using the same workloads for the candidate and baseline.

Production application policy remains explicit: handle failed results, log through
an application-owned sink and reject the operation or use a validated fallback.
Unexpected runtime failures are handled by an application boundary, rather than
being silently converted to valid data by core.
