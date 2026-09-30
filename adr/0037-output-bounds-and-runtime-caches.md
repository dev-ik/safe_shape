# ADR 0037: separate output bounds and root-only async caching

## Status

Accepted

Core owns runtime-backed output-bound introspection. Export and connection
analysis remain in their existing one-way dependent packages. A labelled bound
wrapper is separate from exact snapshots; no new snapshot format or dependency
is introduced. Native merged intersection outputs remain opaque until a sound
bound algorithm is specified.

Connection proofs compare the bound with the exact consumer input. Only proven
containment grants compatibility; other results require review without an
invented producer input. Existing snapshot workflows remain unchanged.

Immutable schema graphs permit caching completed async discovery per root in a
private WeakMap. Never memoize a partial recursive traversal: a node visited
under an ancestor can appear synchronous before a reachable async branch is
examined. Only successful complete root queries populate the cache. Lazy getters
retain their existing resolve-once behavior; failed resolution is not cached.

No-check parse layers reuse their already immutable child/base result instead
of allocating an identical success wrapper. Public result, diagnostic, error
and warning contracts remain unchanged. Performance claims require paired
measurements; no stack suppression or diagnostics omission is permitted.
