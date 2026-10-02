# API contracts

**English** | [Русский](../ru/api/api.md)

`@safe-shape/api` provides the additive API workflow introduced in 3.4.0.
Existing 3.3.0 runtime APIs and snapshots remain unchanged.

## Endpoint and catalog

```ts
import { apiContract, httpEndpoint, createApiClient, toOpenApi } from "@safe-shape/api";
import { object, string } from "@safe-shape/core";

const api = apiContract({
  getUser: httpEndpoint({
    method: "get",
    path: "/users/{id}",
    request: { params: object({ id: string({ minLength: 1 }) }) },
    responses: {
      200: object({ id: string() }),
      404: object({ message: string() }),
    },
  }),
});

const client = createApiClient(api, { baseUrl: "https://example.com/v1" });
const result = await client.getUser({ params: { id: "user_1" } });
if (result.success && result.status === 200) console.log(result.data.id);
const document = toOpenApi(api, { title: "Users", version: "1" });
```

`HttpEndpointConfig` accepts `method`, `path`, `request`, `responses`, optional
`summary` and `description`. Methods are lower-case get/post/put/patch/delete/head/options.
Paths use `{name}` placeholders and cannot contain query/fragment, dot segments,
percent escapes or duplicate placeholders. Catalog keys are stable operation ids;
ambiguous method/template pairs are rejected even when placeholder names differ.
Catalogs copy and freeze their containers. `ApiSchema`, `EndpointRequest`,
`HttpMethod`, `HttpEndpoint`, and `ApiContract` describe this public surface.

Request sections are params/query/headers/body. Parameter sections must be strict
object schemas. Params exactly match required string placeholders. Query fields
are strings/numbers/booleans or arrays of those, optionally wrapped in optional().
Arrays require minLength >= 1: omitted optional fields represent absence. Arrays
use repeated query keys; nested objects and null query values are unsupported.
Headers use lower-case HTTP token names with string values; accept/content-type/
cookie are transport-owned. Body and non-null responses use JSON. Responses are
explicit statuses 200–599; null means no body. GET/HEAD cannot declare a body;
HEAD and statuses 204/205/304 require null. There is no default-status fallback.

Wire schemas cannot contain transforms or stripping objects, including inside
recursive graphs. Runtime refinements, warnings and async rules remain supported.
Callbacks are not executed by catalog construction or tooling. Serialization is
explicit and does not implicitly coerce schema input. The HTTP adapter must parse
query scalar representations/repeated keys according to this declared convention;
this package does not install a server router or perform query decoding.

## Validated client

`createApiClient(api, { baseUrl, fetch? })` returns a frozen mapped `ApiClient`.
The optional fetch implementation enables application transports/testing. The
absolute HTTP(S) base URL retains its path prefix and rejects embedded credentials,
query and fragment. Each operation accepts `InferEndpointRequest` and optional
`ApiCallOptions { signal?: AbortSignal }`; response inference uses
`InferEndpointResponse` with status-dependent data. Invalid input stops before fetch.

`ApiClientResult` is either success with status/data/requestWarnings/responseWarnings,
or `ApiClientFailure` with success false, kind and requestWarnings. Kinds are:

- request-validation or response-validation: native ValidationError; response
  failure also includes status;
- serialization: unsupported/lossy JSON, path segment or header representation;
- network: fetch rejected/aborted (no transport exception payload is exposed);
- decoding: wrong JSON content type, malformed JSON or non-empty no-body response;
- unexpected-status: received status not declared in the endpoint.

Declared 4xx/5xx responses are successful exchanges with their own typed data.
Warnings do not change success. JSON responses require application/json or an
application/*+json media type. Query negative zero is rejected to avoid silently serializing it as zero.
Path segments are encoded; empty and dot segments
are rejected. Header normalization that changes values is rejected. JSON body
serialization rejects non-finite numbers, negative zero, bigint, cyclic data,
non-plain objects, accessors, undefined members and sparse/decorated arrays.
Core optional object fields may already be omitted by normal parsing.

Fetch uses redirect: error, with no automatic retry/fallback. The signal reaches
fetch but does not cancel an async refinement already in progress. Thrown application
validation callbacks follow existing core semantics. No auth/storage/telemetry policy
is installed. Browser applications import `@safe-shape/api/client`, which exports
constructors, client and their types without Node compatibility tooling.

## OpenAPI

`toOpenApi(api, OpenApiOptions { title, version })` emits a frozen OpenAPI 3.1.0
document with Draft 2020-12 schema resources under components.schemas.
`safeToOpenApi` returns `OpenApiExportResult`: success/document or failure/issues;
`OpenApiExportError` is the throwing variant and retains the same issues.
`OpenApiExportIssue` has code, message, immutable path and optional underlying
JSON Schema issue. Codes are openapi.schema.unsupported and openapi.contract.invalid.
Failure never returns/writes a partial document.

Wire input schemas are used for both request and response. Recursive definitions
stay isolated per component with rebased local references. Params/headers use simple
serialization; query uses form/explode. Opaque refinements and unsupported JSON
values fail export. No output bound is labelled exact. This describes the JSON
wire domain; generic OpenAPI validators need not enforce SafeShape's exact built-in
format semantics or Unicode-mode patterns, recorded in x-safe-shape-format and
x-safe-shape-pattern-mode. Generic OpenAPI parameters also cannot express rejecting
undeclared query/header names: x-safe-shape-request-schemas retains each complete
strict section schema for SafeShape-aware tooling. Do not treat generic OpenAPI
validation as a replacement for runtime contracts. See the
[OpenAPI specification](https://spec.openapis.org/oas/v3.1.1.html).

## API evolution

`createApiSnapshot(api)` creates immutable `ApiSnapshot` in API_SNAPSHOT_FORMAT
(safe-shape.api/v1). It includes a deterministic SHA-256 fingerprint and
ApiEndpointSnapshot entries with v2 request/response schema snapshots.
`parseApiSnapshot(unknown)` copies/freezes and validates format, routes, wire
rules, schema ids and both nested and aggregate fingerprints.

`compareApiSnapshots(previous, next)` returns an immutable ApiCompatibilityReport
for updating a server while existing clients remain. Requests use backward
containment; responses use forward containment of the wire input domains.
ApiCompatibilityFinding retains endpoint, code, status, path, message and optional
GraphCompatibilityReport proof. New endpoints are safe; removed endpoints or
changed method/path break. Adding a response status breaks old clients' dispatch;
removing one is safe within accepted-value comparison. This does not establish
application availability or business equivalence. JSON/no-body changes break.
Adding a request section checks the formerly absent body or empty parameter object;
removing a section requires manual review. Opaque proofs stay conservative.

Reports include compatible, decision, previousFingerprint, nextFingerprint and
findings. Decisions are compatible, migration-required or manual-review. Neither
comparison nor check commands modify baselines or send HTTP requests.

```sh
safe-shape --json api export --module ./api.mjs --title Users --version 1 --out ./openapi.json
safe-shape --json api snapshot --module ./api.mjs --out ./api.baseline.json
safe-shape --json api check --module ./api.mjs --against ./api.baseline.json
```

Exports default to default; use --export for a named catalog. Paths are relative
to cwd. Output parent directories must already exist. JSON envelopes contain
ok/command plus document, snapshot or report, and out when writing. Check exits
0 for compatible, 2 for migration/review; operational/export failures exit 1
with stderr error.code api_command_failed or openapi_export_failed (with issues).
