# RFC 0048: Composable runtime contracts

## Status

Accepted for implementation under the user's release-scope instruction.

## Scope and invariants

Add object composition, checked pipelines, recursive declarations, explicit
producer/consumer checks, bounded tagged/tuple witnesses and migration tooling.
Runtime schemas remain authoritative. No framework, serializer, implicit coercion,
automatic baseline replacement or publication is included. Existing APIs and
snapshot formats remain supported; the additive candidate version is 3.2.0.

## Object composition

`object()` returns `ObjectSchemaType` exposing a frozen `shape`, `pick(keys)`,
`omit(keys)`, `partial()`, `required()` and `extend(shape)`. Keys are arrays of
existing string property names. Extension adds new properties only; collisions
throw rather than replacing constraints. Operations retain the unknown-property
policy and annotations and share immutable field schemas. Partial is shallow.
Required rejects absent properties and undefined input/output, preserving field
checks. Shape-changing operations on objects with object-level checks throw;
their static refined type does not expose composition. Compose before refining.

## Checked pipelines

`schema.pipe(next)` validates the first stage, passes successful output into
the next stage and validates its result. It retains original input inference,
next-stage output inference, full paths and ordered warnings. A failed stage
prevents subsequent execution. Async detection includes both stages; synchronous
entry points stay synchronous. Pipelines are required properties unless explicitly
wrapped in optional(). Input is conservatively described as an opaque transform
with an anonymous refinement; output has the next stage's graph plus an anonymous
refinement. Thus declarations can expose its checked output type, but exact JSON
Schema export and compatibility proof must not pretend to reconstruct callbacks
or the complete set of producible outputs. No new snapshot node is required.

## TypeScript artifacts

`toTypeScriptType(schema, { name?, side? })` supports input/output graphs (output
by default), lazy references, reuse and mutual recursion. Definitions receive
deterministic valid names with collision handling. Unproductive alias cycles
fail explicitly. Existing acyclic default output formatting remains stable.
Opaque transforms remain unknown. CLI `schema types --side input|output` matches
the programmatic option. Generated declarations are compile-tested.

## Producer/consumer connections

`checkContractConnection(producerSnapshot, consumerSnapshot)` compares the v2
producer output graph against consumer input. Results name both snapshot ids,
versions via caller-chosen ids, fingerprints and graph roles. `safe` proves
output containment in accepted input within the existing proof model. A witness
is returned only for a faithfully reconstructible, representable output domain;
opaque producers require manual review. No deployed consumers are discovered.
CLI `contract check-connections --manifest file` accepts version 1 manifests
containing named connections and producer/consumer snapshot paths relative to
the manifest. It emits JSON/text and uses 0 for all compatible, 2 for review or
migration, 1 for operational errors. It never executes schema modules or writes
baselines. Existing check/check-many envelopes remain unchanged.

## Counterexamples and adoption

Add tagged unions and tuples under existing depth, width, candidate and value
size budgets. Validate complete witnesses against both reconstructed roots and
independently against original runtime schemas in tests. No witness is not proof.
Provide a restricted source migration tool that never executes input code and
reports unsupported constructs without silently rewriting them. No Zod runtime
dependency enters published packages. Consumer examples cover forms, HTTP and CI;
release evidence distinguishes automated fixtures from human walkthroughs.
