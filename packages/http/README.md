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

See the [HTTP API reference](../../docs/api/http.md) for the public API.
