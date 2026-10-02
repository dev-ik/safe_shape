# SafeShape 3.4.0

**English** | [Русский](ru/release-3.4.0.md)

Status: published on 2026-10-02. All nine npm packages use 3.4.0. See
[release evidence](release-evidence-3.4.md) and the [GitHub release](https://github.com/dev-ik/safe_shape/releases/tag/v3.4.0).

## Changes

- New @safe-shape/api package: immutable httpEndpoint/apiContract catalogs with
  explicit method/path, request schemas and final-status response schemas.
- createApiClient builds a status-discriminated fetch client, validates before
  transport and after decoding, preserves warnings and forwards AbortSignal.
  The @safe-shape/api/client entry is browser-safe without Node tooling.
- toOpenApi/safeToOpenApi export OpenAPI 3.1.0 using isolated Draft 2020-12
  components and URI-encoded recursive references. Unsupported opaque rules
  produce structured errors without a partial document. Non-JSON literals are
  rejected before serialization can erase or change their constraints.
- createApiSnapshot/parseApiSnapshot/compareApiSnapshots check whole-API server
  evolution: backward request compatibility, forward response compatibility,
  route deletion/change and response dispatch changes.
- CLI adds api export, api snapshot and api check. Check exits 0 for compatible,
  2 for migration/review, and 1 for operational errors; baseline overwrite is rejected.
- Umbrella exports, EN/RU guides, installed consumers and all nine-package
  release gates include the new package. RFC 0050 and ADR 0038 document semantics.

## Upgrade from 3.3.x

No breaking existing API, snapshot format or default behavior is intended.
Update safe-shape or all scoped packages you use to 3.4.0 together. Existing
core, HTTP and tooling calls require no migration. Install:

```sh
npm install safe-shape@3.4.0
```

Use @safe-shape/api/client in browser applications; the root API entry combines
runtime and Node tooling. Node >=20.10 and ESM remain the package requirements.

## Scope and limitations

The new transport supports JSON bodies/responses, string path parameters,
scalar query fields and non-empty repeated-key query arrays. Wire schemas
reject transforms and stripping objects. Cookies, multipart, automatic retries,
server routing and query decoding are not provided. Generic OpenAPI cannot
replace native format/pattern validation or strict parameter-section validation;
SafeShape extensions retain those semantics. Declared non-2xx responses are typed
exchanges. AbortSignal cancels fetch, not an already running async refinement.
Removing a constrained request section requires manual review. Compatibility
compares accepted wire domains, not business equivalence or endpoint availability.
See the [API reference](api/api.md) and [executable example](../examples/api-workflow.mjs).

## Qualification

Run npm run prepare:release for the complete gate and nine archives. Final
commit CI covers Node 20.10.0 and 24. Independent developer walkthrough is not
recorded as passed; automated journeys are documented separately. The owner
explicitly authorized the 3.4.0 release with this limitation disclosed.
