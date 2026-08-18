# RFC 0020: Contract IR v2 and lazy schemas

## Status

Accepted for the first Contract IR v2 implementation slice.

## Motivation

Tree-shaped `SchemaDefinition` values cannot represent repeated or recursive
contracts. They also expose only the runtime validation pipeline, while
SafeShape 2.0 needs independently addressable input and output contract sides.

The new model must remain deterministic, make erased transform outputs
explicit, and avoid silently changing the existing contract snapshot format.

## Proposal

Add `lazy(getSchema, { id })` to core:

```ts
interface Node {
  readonly value: string;
  readonly children: readonly Node[];
}

let nodeSchema: Schema<Node>;
nodeSchema = lazy(
  () => object({
    value: string(),
    children: array(nodeSchema),
  }),
  { id: "Node" },
);
```

The id is mandatory, trimmed, non-empty, and stable. A description rejects two
different lazy schemas that claim the same id. The getter is resolved lazily
and cached by the schema instance. Returning the lazy schema itself directly is
invalid; recursion must pass through a concrete container.

Add `describeContract(schema)`:

```ts
interface SchemaContractDescription {
  readonly format: "safe-shape.contract-ir/v2";
  readonly input: SchemaContractGraph;
  readonly output: SchemaContractGraph;
}

interface SchemaContractGraph {
  readonly root: SchemaDefinition;
  readonly definitions: Readonly<Record<string, SchemaDefinition>>;
}
```

Lazy occurrences are represented as `{ kind: "reference", id }`. Their
targets appear once in the graph's definitions. Definition ids and object keys
are sorted deterministically.

Input and output graphs are traversed independently. On the input side a
transform remains an explicit transform pipeline node because it can affect
whether parsing succeeds. On the output side its erased result is represented
as `{ kind: "opaque", behavior: "transform", id }`. SafeShape must not claim a
structural output contract that cannot be observed at runtime.

`describeSchema()` remains the legacy tree-description API. Existing acyclic
descriptions remain unchanged. A lazy occurrence is returned as a reference,
but definitions are available only from `describeContract()`.

## Tooling Boundary

`@safe-shape/json-schema` consumes the selected Contract IR graph and supports
references through `$defs` and `$ref`. Input remains the default side for
compatibility with existing transform export behavior. Exporting an opaque
output throws instead of silently approximating it.

Contract snapshot v1 remains unchanged. It rejects references because the v1
format has no definitions table. A later RFC will define snapshot v2,
fingerprints for graph-shaped contracts, and compatibility traversal through
references.

RFC 0021 subsequently defines snapshot v2 and graph fingerprints. Recursive
compatibility traversal remains a separate compatibility-engine milestone.

## Compatibility

- Existing builders and acyclic `describeSchema()` values are unchanged.
- `lazy()` and `describeContract()` are additive APIs.
- JSON Schema output for existing schemas remains equivalent and deterministic.
- Snapshot v1 bytes and fingerprints remain unchanged for supported schemas.

`SchemaDefinition` gains `reference` and `opaque` variants. This is a deliberate
2.0 source change for consumers with exhaustive switches; they must handle the
new explicit cases before upgrading. This change must not ship in a 1.x
release.

## Non-Goals

- Snapshot v2 or recursive compatibility rules.
- Structural transform output schemas or codecs.
- Automatic ids derived from source code, variable names, or object identity.
- Deduplicating unrelated non-lazy schema instances.
