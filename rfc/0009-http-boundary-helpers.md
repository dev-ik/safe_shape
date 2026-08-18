# RFC 0009: http-boundary-helpers

## Status

Accepted and retained for SafeShape 2.0.

## Motivation

Applications validate external HTTP data at request and response boundaries. SafeShape
needs helpers that compose core schemas without coupling to one web framework.

## Proposal

Add `@safe-shape/http` with `httpContract(config)`.

Supported contract sections:

- `params`
- `query`
- `body`
- `headers`
- `cookies`
- `response`
- `responses`

Each section accepts a core schema.

The contract exposes:

- `safeParseRequest(input)`
- `parseRequest(input)`
- `safeParseResponse(input, status?)`
- `parseResponse(input, status?)`

The package also exposes standalone adapter-style helpers:

- `safeParseHttpRequest(contract, input)`
- `parseHttpRequest(contract, input)`
- `safeParseHttpResponse(contract, input, status?)`
- `parseHttpResponse(contract, input, status?)`

Request failures prefix issue paths with the failing section name, for example
`["body", "email"]`.

The package is framework-neutral. It accepts plain objects and returns core `ParseResult`
and `ValidationError` values.

## Alternatives

- Add HTTP helpers to `@safe-shape/core`. This is rejected because package architecture
  keeps core and HTTP loosely coupled.
- Build Express/Fastify adapters first. This is deferred until the framework-neutral
  boundary contract is stable.

## Migration

No migration is required because `@safe-shape/http` is additive.
