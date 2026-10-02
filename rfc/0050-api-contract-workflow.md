# RFC 0050: endpoint catalogs, OpenAPI, clients and API evolution

## Status

Accepted

The user authorized implementation of the four-part API workflow.

## Public surface

`@safe-shape/api` exports `httpEndpoint`, `apiContract`, `createApiClient`,
`safeToOpenApi`, `toOpenApi`, `OpenApiExportError`, `createApiSnapshot`,
`parseApiSnapshot`, `compareApiSnapshots`, and their documented types.
The umbrella re-exports them. The browser-safe `@safe-shape/api/client` entry
exports endpoint/catalog constructors and the client without Node tooling.
CLI commands are `api export`, `api snapshot`, and `api check`.

## Wire semantics

An endpoint has a lower-case HTTP method, an absolute path template such as
`/users/{id}`, optional request schemas (`params`, `query`, `headers`, `body`),
and a non-empty explicit final-status response map. `null` denotes no body.
GET/HEAD have no request body; HEAD and statuses 204/205/304 require null.
Transforms and stripping objects are rejected throughout wire schema graphs:
the same schema describes the JSON value sent and received. Existing core and
HTTP schemas are unaffected. Refinements and async rules are supported at runtime
but cannot be silently approximated in export or compatibility proofs.

Parameter sections are strict objects. Path fields are required strings and
exactly match template placeholders; headers use lower-case HTTP token names
and string values; query fields are strings, finite numbers, booleans, or arrays
of these, with optional wrappers. Query arrays require minLength >= 1 and use repeated keys (form/explode),
headers and paths use simple scalar serialization. Nested/null query values,
cookies, multipart, default status fallbacks, and arbitrary transport hooks
are outside this initial API. JSON bodies must be losslessly serializable.
Absent optional sections are validated as empty objects. Headers are explicit;
browser authentication and credentials policy remain application-owned.

The client validates before transport and validates a declared status/body
after transport. Results discriminate request validation, response validation,
serialization, network, decoding, and undeclared-status failures. Declared
non-2xx responses are typed successful exchanges, retaining the HTTP status.
Warnings are kept separately for request and response. No retry or fallback
is implicit. Fetch cancellation uses a supplied AbortSignal; it does not cancel
an already running custom validation callback. Redirects are rejected by default.

## OpenAPI

Emit OpenAPI 3.1.0 with JSON Schema Draft 2020-12 schema resources stored under
components.schemas. Each resource has its own definitions; local references
are rebased to its component location. Requests and responses use wire input
schemas. No output bound is presented as exact. Opaque refinements, non-JSON
values and unsupported constraints fail with frozen structured issues and no
partial document. Formats/patterns retain explicit SafeShape semantic extensions.
Document operation ids are catalog keys, with duplicate canonical routes rejected.
Generic OpenAPI does not express strict parameter-object extra-key rejection;
x-safe-shape-request-schemas preserves these full section schemas for tooling.
OpenAPI does not replace runtime validation.

## Snapshots and comparison

API snapshot v1 includes endpoint ids, methods, paths, request sections and
responses containing validated ContractSnapshotV2 values. Loading verifies
fingerprints using existing parsers, validates transport structure, copies and
freezes data. Creating/comparing never sends HTTP or updates a baseline.
Comparison models updating a server while existing clients remain:
requests use backward containment, responses use forward wire containment.
Adding endpoints is safe; deleting endpoints or changing method/path is breaking.
New response statuses are breaking (old clients cannot dispatch them); removed
statuses are safe under the documented accepted-value model. New required
request sections break; optional sections accepting absence are compared to
absence; removing a constrained request section requires manual review.
Unknown/risky proofs never count as compatible. Empty JSON bodies and no-body
responses are distinct. API check exits 0 for compatible, 2 for breaking/review,
1 for operational errors. Reports retain underlying per-schema proofs.

## Compatibility and qualification

All additions preserve existing APIs, defaults and snapshot formats. This is a
candidate for the planned 4.0 workflow, not a reason to manufacture a breaking
change or publish a version. Package versions remain on the current line until
release qualification/version selection. Tests cover runtime transport, invalid
configuration, strong input/output inference, recursive export references,
snapshot corruption, directionality, CLI exits and installed consumers.
