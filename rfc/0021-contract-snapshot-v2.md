# RFC 0021: graph contract snapshots and fingerprints

## Status

Accepted for the Contract IR v2 snapshot slice.

## Motivation

Snapshot v1 stores one tree-shaped runtime input contract. It cannot represent
references or recursion and it cannot fingerprint schema input and output
independently. Contract IR v2 provides both graphs, so the stored artifact needs
an explicitly versioned graph format without silently changing existing v1
bytes or APIs.

## Proposal

Add two explicit APIs to `@safe-shape/compat`:

- `createContractSnapshotV2(schema, options)`;
- `parseContractSnapshotV2(value)`.

The format identifier is `safe-shape.contract/v2`:

```ts
interface ContractSnapshotV2 {
  readonly format: "safe-shape.contract/v2";
  readonly id: string;
  readonly fingerprint: string;
  readonly input: ContractGraphSnapshot;
  readonly output: ContractGraphSnapshot;
}

interface ContractGraphSnapshot {
  readonly fingerprint: string;
  readonly root: ContractGraphNode;
  readonly definitions: Readonly<Record<string, ContractGraphNode>>;
}
```

Each side has an independent fingerprint. The top-level fingerprint covers the
input and output graph contents together. Contract ids and the redundant stored
fingerprint fields are not part of the hashed semantic payload.

Graph nodes retain the JSON-safe v1 representation and add explicit
`reference` and `opaque` variants. References must resolve inside the graph.
Definitions not reachable from the root are rejected so one semantic graph has
one canonical stored representation.

## Canonicalization

Fingerprint input is compact UTF-8 JSON produced with these rules:

- object keys are sorted lexicographically at every depth;
- definition ids and object shape keys are sorted lexicographically;
- required-property lists are sorted;
- enum values are sorted by type and value because enum order is not semantic;
- semantically ordered arrays such as tuples and unions retain their order;
- special JavaScript literals use the existing `$safeShape` encoding;
- metadata examples are omitted;
- SHA-256 is encoded as lowercase hexadecimal with a `sha256:` prefix.

Parsing reconstructs the canonical key order, freezes the graph recursively,
validates every reference, rejects unreachable definitions, and verifies all
three fingerprints.

## Migration

The existing `createContractSnapshot()`, `parseContractSnapshot()`,
`ContractSnapshot`, and `CONTRACT_SNAPSHOT_FORMAT` remain v1-only. Their output,
fingerprints, and rejection of recursive schemas do not change.

Consumers opt into v2 with the explicitly named APIs. This lets repositories
keep existing v1 baselines while adding v2 baselines alongside them. A later
compatibility RFC may change the recommended default during the 2.0 release,
but it must not reinterpret a v1 artifact as v2.

## Non-Goals

- Traversing recursive references during compatibility comparison.
- Comparing v1 and v2 snapshots directly.
- Changing the current CLI snapshot default before graph comparison exists.
- Inferring stable definition ids from source code or object identity.
