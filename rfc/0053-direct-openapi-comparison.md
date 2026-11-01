# RFC 0053: Direct OpenAPI comparison

## Status

Accepted

Add `compareOpenApi(previous, next, options?)` to `@safe-shape/api` and the
umbrella export. Inputs are YAML/JSON strings or JSON-compatible objects.
Support OpenAPI 3.0.x and 3.1.x. Match operations by method and path, independent
of operationId; compare requests backward and responses forward through
`compareContractsV2`. Return immutable `compatible`, `decision`, `findings`, and
`issues`; invalid or unsupported input yields manual-review, never a safe proof.
Findings retain the underlying SafeShape comparison and document paths. Issues
identify the previous/next source. No baseline, filesystem, network or runtime
application execution is involved.

Import typed primitives, scalar enum/const, object properties/required,
additionalProperties booleans and pure dictionaries, arrays, anyOf, allOf,
local JSON Pointer references (including guarded recursion), nullable in 3.0,
and native length/range/multipleOf/pattern constraints. Unsupported assertions
fail closed. In particular oneOf, exclusive bounds, uniqueItems, readOnly and
writeOnly projections, mixed typed additionalProperties, and external references
require manual review. XML and non-JSON media also require review. This is an explicitly supported subset, not an assertion
that arbitrary OpenAPI can be represented losslessly.

Formats default to rejection. `formatPolicy: "annotation"` explicitly selects
OpenAPI's annotation interpretation; `"safe-shape"` opts into SafeShape's four
native string formats. Neither option coerces values. All imported schemas are
interpreted over JSON values; inferred output types remain unknown.

Compare inherited/overridden parameters in path, query, header and cookie;
normalize header names. Serialization changes require manual review. Compare
body requiredness, concrete JSON media types, response headers, explicit/range/default
response statuses. Authentication and server configuration changes require
manual review; callbacks, links, webhooks and unsupported encodings fail closed.
Descriptions, examples and operationIds are annotations, not wire compatibility.

Parse YAML 1.2 with duplicate-key checks and bounded aliases. Copy JSON data
without evaluating getters; reject cycles, non-JSON values and excessive nesting.
Bound reference/schema expansion. Report unsupported dialects and keywords at
their source paths. A failure returns no partial compatibility proof.

Release as 4.0.0, an additive minor version. Preserve existing APIs and snapshot
formats. Verify direct YAML and installed-package use, both containment
directions, malformed input, unsupported assertions, recursion and release gates.

References: [OpenAPI 3.0](https://spec.openapis.org/oas/v3.0.3.html),
[OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.1.html),
[YAML parser](https://eemeli.org/yaml/).

Release 4.0.0 also includes the independent MCP runtime and breaking return-type
change described in RFC 0054. This OpenAPI API itself is additive.
