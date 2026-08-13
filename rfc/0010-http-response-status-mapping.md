# RFC 0010: http-response-status-mapping

## Motivation

HTTP responses can have different valid shapes for different status codes. SafeShape needs
status-specific response validation without coupling to a web framework.

## Proposal

Extend `httpContract(config)` with `responses`.

Example:

```ts
const contract = httpContract({
  responses: {
    200: object({ id: string() }),
    404: object({ message: string() }),
  },
});
```

Response parsing accepts an optional status:

- `safeParseResponse(input, status)`
- `parseResponse(input, status)`
- `safeParseHttpResponse(contract, input, status)`
- `parseHttpResponse(contract, input, status)`

Runtime selection:

1. If `status` is provided and `responses[status]` exists, use that schema.
2. Otherwise, if `response` exists, use it as a fallback schema.
3. Otherwise, if `status` is provided but no schema exists, return a `custom` issue at
   `["response", "status"]`.
4. Otherwise, return the input unchanged.

## Alternatives

- Require a response schema for every status. This is too strict for early HTTP helpers.
- Add status handling to core schemas. This is rejected because status is HTTP-specific.

## Migration

No migration is required because `responses` and the optional status argument are additive.
