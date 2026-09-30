# RFC 0049: explicit checked output bounds

## Status

Accepted

Implementation is part of the authorized 3.3 scope.

## Problem

Pipelines validate their final output but exact Contract IR intentionally retains
an anonymous restriction: accepted final-stage values need not all be produced.
Users need a separately labelled upper bound for export and connection proofs.

## API

- `describeOutputBound(schema)` in core returns a frozen
  `SchemaOutputBound { format: "safe-shape.output-bound/v1", graph }`.
- `toJsonSchema` / `safeToJsonSchema` accept `mode: "exact" | "output-bound"`;
  exact remains the default. Bound mode requires `side: "output"` explicitly,
  and success carries a structured `json_schema.output.bound` warning through
  the safe API. The throwing API returns only the requested artifact as usual.
- `checkSchemaConnection(producer, consumer, { producerId?, consumerId? })`
  in compat returns a frozen `SchemaConnectionReport`, containing the connection
  report fields plus `evidence: "output-bound"`. Its producer fingerprint refers
  to the bound graph, not an exact output snapshot.

## Semantics

Describe only possible successful outputs. At a pipeline use the final stage's
output bound without the synthetic pipeline restriction. Preserve real opaque
rules conservatively. Project stripping object output to declared keys only.
Merged intersections and unvalidated final transform outputs remain opaque.
Traverse recursive definitions with the existing collision checks. Do not call
mappers, predicates or collectors. Lazy resolution follows normal introspection.

An upper bound contained in consumer input proves connection safety. Failure to
prove containment does not prove that the producer emits a rejected value; return
`unknown` with manual-review diagnostics. Never generate witnesses for this API.
Use existing snapshot connections when concrete native witnesses are needed.

The original `describeContract`, v1/v2 snapshots, `checkContractConnection`,
default JSON export, Standard JSON Schema and TypeScript output are unchanged.
The new bound wrapper is not a contract snapshot and must not be stored as one.
The mode does not establish totality: producers may reject input or throw due to
application failures. It describes successfully parsed outputs only.

## Validation

Test native/checked/opaque stages, downstream refinements, async rules, nested
and recursive values, strip/passthrough objects, intersections, both dialects,
unchanged exact failures, callback non-execution and independent runtime output
acceptance for every proven connection in a generated fixture matrix.
