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

See `docs/api/http.md` for the public API.
