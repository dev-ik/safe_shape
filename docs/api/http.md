# HTTP API

`@safe-shape/http` provides framework-neutral helpers for validating HTTP boundary data
with `@safe-shape/core` schemas.

## Contract

Use `httpContract(config)`.

Supported sections:

- `params`
- `query`
- `body`
- `headers`
- `cookies`
- `response`
- `responses`

Each section accepts a core schema.

## Request Parsing

Contracts expose:

- `safeParseRequest(input)`
- `parseRequest(input)`

`safeParseRequest` returns a core `ParseResult`.

Standalone helpers are also available for adapter-style code:

- `safeParseHttpRequest(contract, input)`
- `parseHttpRequest(contract, input)`

Request failures prefix issue paths with the section name:

```txt
input.body.email
input.headers.authorization
input.cookies.session
```

For failed ordinary unions, section prefixes are applied recursively to every
issue in the preserved `branches` tree as well as to the root issue.

Addressable custom diagnostics keep collector order and receive the same
section prefix. For example, a body refinement issue with relative path
`["end"]` is returned at `["body", "end"]`.

## Response Parsing

Contracts expose:

- `safeParseResponse(input, status?)`
- `parseResponse(input, status?)`

Standalone helpers are also available:

- `safeParseHttpResponse(contract, input, status?)`
- `parseHttpResponse(contract, input, status?)`

If no response schema is configured, response parsing returns the input unchanged.

Use `responses` for status-specific response schemas:

```ts
const contract = httpContract({
  responses: {
    200: object({ id: string() }),
    404: object({ message: string() }),
  },
});

const response = contract.parseResponse({ id: "user_1" }, 200);
```

If `status` is provided and no status schema exists, `response` is used as a fallback
when configured. Without a fallback response schema, parsing fails at `input.response.status`.

## Compatibility Presentation

`@safe-shape/http` remains a runtime-only package. For contract evolution,
compare the relevant request or response schema with `@safe-shape/compat`, then
create an HTTP-specific presentation:

```ts
import {
  compareContractsV2,
  createHttpCompatibilityPresentation,
} from "@safe-shape/compat";

const report = compareContractsV2(previousResponse, nextResponse, {
  compatibility: "forward",
});
const presentation = createHttpCompatibilityPresentation(report, {
  exchange: "response",
});
```

Request producers are clients and request consumers are servers. Response
producers are servers and response consumers are clients. Backward containment
is presented as consumer compatibility; forward containment is presented as
producer compatibility. Full mode covers both roles.

## Example

```ts
import { object, string } from "@safe-shape/core";
import { httpContract, parseHttpRequest } from "@safe-shape/http";

const contract = httpContract({
  params: object({ id: string() }),
  body: object({ name: string() }),
  headers: object({ authorization: string() }),
  cookies: object({ session: string() }),
  response: object({ id: string() }),
  responses: {
    404: object({ message: string() }),
  },
});

const request = contract.parseRequest({
  params: { id: "user_1" },
  body: { name: "Dev" },
  headers: { authorization: "Bearer token" },
  cookies: { session: "session_1" },
});

const sameRequest = parseHttpRequest(contract, {
  params: { id: "user_1" },
  body: { name: "Dev" },
  headers: { authorization: "Bearer token" },
  cookies: { session: "session_1" },
});
```
