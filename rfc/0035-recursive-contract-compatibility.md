# RFC 0035: recursive contract compatibility

## Status

Accepted for the recursive compatibility slice of SafeShape 2.0.

## Motivation

Contract snapshot v2 can store reusable and recursive input/output graphs, but
the existing comparison APIs consume only tree-shaped v1 snapshots. Teams
therefore cannot check the compatibility of contracts built with `lazy()`.

Graph comparison must preserve the existing accepted-value containment model,
terminate on cycles, and avoid treating reference names or reuse topology as
runtime semantics.

## Proposal

Add two explicit APIs to `@safe-shape/compat`:

```ts
compareContractsV2(previousSchema, nextSchema, {
  compatibility: "backward",
  side: "input",
});

compareContractSnapshotsV2(previousSnapshot, nextSnapshot, {
  compatibility: "backward",
  side: "output",
});
```

`side` is `"input" | "output"` and defaults to `"input"`, matching the
validation-facing behavior of the existing v1 comparison API. The returned
graph report includes the selected side and that side's previous and next
fingerprints.

The functions remain separate from the v1 APIs. V1 snapshots and comparison
results do not change, and v1/v2 snapshots are not compared implicitly.

## Graph Semantics

References are transparent aliases for their definitions:

- each reference resolves only in its own snapshot graph;
- definition ids may change without changing compatibility;
- sharing one definition or repeating equivalent definitions has the same
  accepted-value semantics;
- findings use semantic schema paths rather than definition-table paths.

When a pair of nodes is encountered again while that same pair is being
compared, the recursive edge is accepted provisionally. The surrounding
concrete nodes must still prove containment. This coinductive rule terminates
regular recursive graphs without declaring an unmatched concrete change safe.

Missing references remain invalid snapshot data. Snapshot creation and parsing
already reject them; comparison also returns `unknown` defensively if an
unvalidated object reaches the API.

Metadata-only graph changes return `annotation-only`. Stable matching opaque
output ids may be treated as the same declared behavior. Anonymous or changed
opaque output behavior remains `unknown`.

## Compatibility

- Existing v1 functions and snapshot bytes are unchanged.
- V2 comparison is opt-in through explicitly named functions.
- The same backward, forward, and full containment directions are used.
- Recursive structural changes reuse the normative primitive, collection,
  union, and object-policy rules.
- Unsupported or opaque relationships remain `unknown`.

## Non-Goals

- Comparing v1 and v2 snapshots directly.
- Treating definition ids or graph sharing topology as semantic.
- Inferring structural transform outputs that Contract IR marks opaque.
- Changing the CLI snapshot default in this slice.
