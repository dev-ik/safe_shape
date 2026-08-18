# RFC 0027: preserve failed union branch diagnostics

## Status

Accepted for the final production-core M3 slice.

## Motivation

An ordinary `union()` currently returns one stable `invalid_union` issue after
all choices fail, but discards the issues that explain why each choice failed.
This makes structurally similar API payloads difficult to debug and forces
callers to re-run branch schemas manually.

SafeShape should keep the stable summary issue while exposing complete,
machine-readable branch evidence.

## Proposal

Extend `Issue` with optional recursive union branches:

```ts
interface UnionIssueBranch {
  readonly index: number;
  readonly issues: readonly Issue[];
}

interface Issue {
  // existing fields
  readonly branches?: readonly UnionIssueBranch[];
}
```

When every ordinary union choice fails, its root `invalid_union` issue contains
one branch per declared choice. Branch order and `index` match declaration
order. Each branch retains all original issue codes and complete paths. Nested
unions retain the same recursive structure.

The root issue's existing code, path, expected, received, message, and
suggestion remain unchanged. A successful choice still returns immediately and
does not expose failures from earlier choices.

Every branch object, branch list, and issue list is frozen. `createIssue()`
defensively copies branch containers, validates non-negative unique indexes and
non-empty issue lists, and only permits branches on `invalid_union`.

## Diagnostics and Tooling

`Diagnostic` gains the equivalent recursive branch structure. Human-readable
formatting prints the union summary followed by indented `Union branch N`
sections. Validation reports and CLI JSON output preserve the native `Issue`
shape without flattening it. HTTP request adapters prefix section paths
recursively through the branch tree.

Contract IR, JSON Schema, TypeScript generation, snapshots, and compatibility
analysis are unchanged because accepted values and schema structure do not
change.

## Compatibility

This is an additive field on the deliberate 2.0 issue surface. Existing code
that reads the stable root `invalid_union` fields continues to work. Exact JSON
snapshots of failed validation reports intentionally gain branch data and must
be reviewed as a 2.0 artifact change.

## Non-Goals

- Selecting or ranking a "best" branch.
- Flattening branch issues into the root issue list.
- Changing first-success union semantics.
- Adding branch diagnostics to `discriminatedUnion()`, which already selects a
  branch explicitly and returns that branch's issues directly.
- Changing union compatibility containment rules.
