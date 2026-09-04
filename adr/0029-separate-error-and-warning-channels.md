# ADR 0029: Separate error and warning channels

## Status

Accepted for SafeShape 3.0.

## Context

Warnings must survive successful parsing without weakening the meaning of
`success`, while existing consumers depend on `ValidationError.issues` being
fatal and on data-only `parse()`.

## Decision

Native diagnostics use an explicit severity. Fatal `Issue` values remain on
the error channel; non-fatal `Warning` values use a separate frozen warnings
channel on successful results and `ValidationError`. Empty success warnings
are omitted for shape compatibility. Containers preserve deterministic order,
and warnings from rejected union choices remain nested in those branches.

Custom semantics use a stable `ruleId` plus bounded JSON-safe `params` rather
than arbitrary issue codes. Boundary packages propagate the channels without
interpreting them. Standard Schema uses an optional extension field.

## Consequences

Exact issue snapshots and exhaustive native diagnostic handling require a
major-version migration. Existing code that reads only success/data or
error/issues keeps working after recompilation. Applications can localize and
route warnings without parsing English text or treating them as failures.
