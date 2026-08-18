# RFC 0036: HTTP compatibility presentation

## Status

Accepted for the HTTP presentation slice of SafeShape 2.0.

## Motivation

The compatibility engine correctly defines backward and forward containment,
but those direction names are easy to misread at an HTTP boundary. HTTP teams
reason about requests and responses, clients and servers, and producers and
consumers.

The presentation layer must explain the existing result without changing or
re-running the proof.

## Proposal

Add `createHttpCompatibilityPresentation(report, options)` to
`@safe-shape/compat`:

```ts
const report = compareContractsV2(previousBody, nextBody, {
  compatibility: "backward",
});

const presentation = createHttpCompatibilityPresentation(report, {
  exchange: "request",
});
```

`exchange` is `"request" | "response"`. The presentation exposes:

- the fixed producer and consumer parties for the exchange;
- a compatibility focus derived from the requested mode;
- the original status, compatibility mode, fingerprints, and optional graph
  side;
- an immutable list that pairs every original finding with its affected HTTP
  party and producer/consumer role;
- a stable human-readable summary.

The semantic mapping is:

| Exchange | Producer | Consumer |
| --- | --- | --- |
| request | client | server |
| response | server | client |

Backward containment (`previous ⊆ next`) proves that the next consumer accepts
values from the previous producer, so its focus is `consumer`. Forward
containment (`next ⊆ previous`) proves that values from the next producer remain
accepted by the previous consumer, so its focus is `producer`. Full mode covers
both roles. Individual findings retain their original direction and map it by
the same rule.

## Compatibility

- Existing compatibility reports and proof semantics do not change.
- The API accepts both tree and graph reports.
- No HTTP runtime objects or framework adapters are required.
- Frozen input reports remain unmodified and are referenced by immutable
  presentation findings.

## Non-Goals

- Defining endpoint routing or an OpenAPI operation catalog.
- Inferring request/response schemas from framework metadata.
- Changing backward or forward containment semantics.
- Replacing the underlying machine-readable compatibility finding.
