# Checked output bounds

**English** | [Русский](ru/checked-output.md)

Requires SafeShape 3.3.0. This release includes these APIs;
3.2.x packages do not. See the [release notes](release-3.3.0.md).

```ts
import { string, number, checkSchemaConnection, safeToJsonSchema } from "safe-shape";

const Page = string({ pattern: "^[0-9]+$" }).transform(Number)
  .pipe(number({ integer: true, minimum: 1, maximum: 100 }));
const Consumer = number({ integer: true, minimum: 1 });

Page.parse("12"); // 12
Page.safeParse("0").success; // false
checkSchemaConnection(Page, Consumer).compatible; // true
const exported = safeToJsonSchema(Page, {
  side: "output", mode: "output-bound", target: "draft-2020-12",
});
```

The last pipeline stage checks every successful output. Its native constraints
bound those outputs; they do not establish that every value inside the bound
can actually be produced. For example, a mapper that always returns `1` can have
the checked bound `number({ minimum: 1, maximum: 100 })`.

## Runtime and inference

Use existing `.transform(mapper).pipe(next)`; no implicit coercion is added.
The original input type and final output inference stay intact. Both stages
participate in async discovery. Native errors, full paths, warning order and
short-circuit execution are unchanged.

## Introspection and export

`describeOutputBound(schema)` from core returns a frozen
`{ format: "safe-shape.output-bound/v1", graph: { root, definitions } }`.
The graph supports recursive definitions and nested checked pipelines. Stripping
objects describe only emitted keys. An unchecked final mapper and merged
intersection output remain opaque; real custom restrictions are not erased.

`toJsonSchema` and `safeToJsonSchema` accept `mode: "output-bound"` only with
explicit `side: "output"`. Both existing dialects work. Successful safe export
includes the warning `json_schema.output.bound`, even for native schemas, so
tools can identify the requested semantics. The throwing API returns just the
artifact. Export still fails on unsupported opaque output or custom rules.

Default `mode: "exact"`, Standard JSON Schema conversion, CLI export, exact
Contract IR and snapshots retain their previous behavior. A bound is not a
snapshot and is not an exact specification of transform reachability.

## Connections

`checkSchemaConnection(producer, consumer, options?)` lives in compat. Options
are `producerId` (default `producer`) and `consumerId` (default `consumer`).
It returns `SchemaConnectionReport`, with the existing connection-report fields
and `evidence: "output-bound"`. The producer fingerprint identifies the bound
graph; the consumer fingerprint identifies its input graph.

Containment proves that successful producer outputs fit the consumer. A bound
outside the consumer cannot prove a breaking emitted value: the result requires
manual review (`unknown`). The API never constructs producer inputs or executes
application callbacks, and its counterexample is explicitly unavailable.
Lazy getters may resolve, as with existing introspection. Opaque consumer
refinements remain conservative. This is not a guarantee that every producer
input succeeds or that arbitrary application code cannot throw.

Use `checkContractConnection()` for stored v2 snapshot checks and supported
native producible counterexamples. Existing snapshot formats and comparisons
are unchanged. Run [the complete example](../examples/checked-output.mjs) with
`node examples/checked-output.mjs` after building the workspace.
