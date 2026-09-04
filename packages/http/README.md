# @safe-shape/http

Framework-neutral HTTP boundary helpers for SafeShape runtime contracts.

## Usage

```ts
import { object, string } from "@safe-shape/core";
import { httpContract, safeParseHttpRequest } from "@safe-shape/http";

const contract = httpContract({
  params: object({
    id: string(),
  }),
});

const result = safeParseHttpRequest(contract, {
  params: {
    id: "user_1",
  },
});
```

The package depends only on `@safe-shape/core`.

For evolution reports, use `compareContractsV2()` and
`createHttpCompatibilityPresentation()` from the optional
`@safe-shape/compat` package. The presentation maps request/response reports to
client/server and producer/consumer terminology without adding a runtime
dependency here.

Request issue paths are prefixed with their HTTP section. For failed ordinary
unions, the same prefix is applied recursively to every preserved branch issue.
Addressable custom refinement issues retain collector order and receive the
same section prefix.
Warnings retain the section prefix without changing success. Async schemas use
the contract or standalone `safeParseRequestAsync()` /
`safeParseResponseAsync()` families.

For production response drift, `recoverHttpResponse()` (or
`recoverHttpResponseAsync()`) returns an immutable
`valid`, `recovered`, or `unavailable` state. Eager and lazy fallbacks are
validated through the same response contract and status; invalid network and
fallback payloads are never returned as inferred data. Telemetry, storage, and
UI policy remain application-owned. See [Production response
recovery](../../docs/production-response-recovery.md) for the typed flow and
telemetry guidance.

See the [HTTP API reference](../../docs/api/http.md) for the public API.
