# ADR 0041: OpenAPI import stays in the API tooling package

## Status

Accepted

Keep direct OpenAPI comparison in `@safe-shape/api`, beside OpenAPI export.
Use `yaml` only in this Node tooling entry; the browser client entry and core
remain independent. Import schemas into existing immutable core constructors;
all containment proofs remain owned by `@safe-shape/compat`.

Use a private normalized operation model rather than `ApiContract`: generic
OpenAPI permits numeric path parameters, cookie parameters, default/range
responses and multiple media types that the validated fetch client's transport
intentionally excludes. Do not weaken that client's wire guarantees or modify
its public snapshot format to accommodate an import tool.

Expose only direct comparison and its report/options types. Unsupported
semantics become source-addressed issues and manual-review results; never erase
an assertion to manufacture a compatible report. Keep structural HTTP evolution
separate from schema containment. Preserve existing release artifacts while
qualifying the next minor release.
