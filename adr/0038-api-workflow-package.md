# ADR 0038: API workflow as a dependent package

## Status

Accepted

Keep core, HTTP, JSON Schema and compatibility dependency directions unchanged.
Add `@safe-shape/api -> core/http/json-schema/compat`; CLI and umbrella depend
on API. Endpoint and client modules use only core/HTTP and browser fetch APIs.
The `./client` entry excludes compatibility's Node crypto dependency; the root
entry combines runtime and tooling for Node workflows.

Reuse HTTP parsing and existing exact JSON Schema and v2 compatibility engines.
Do not add frameworks, schema coercion, an OpenAPI validator dependency or
generated client code. A mapped client is inferred directly from the immutable
catalog. Restrict the initial transport to an explicit, shared wire model so
the exporter, client and comparison cannot disagree about serialization.

Document this new package in release, consumer-install and translation gates.
Keep publication separate from implementation and leave existing release artifacts
untouched. Every public artifact/result is immutable; application payloads retain
the core runtime's existing immutability semantics.
