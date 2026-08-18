# RFC 0030: dialect-aware JSON Schema export

## Status

Accepted for the third standards-and-artifacts M4 slice.

## Motivation

SafeShape currently renders JSON Schema with Draft 2020-12 keywords even when
the caller supplies a Draft 7 `$schema` URI. Standard JSON Schema V1 also
advertises `draft-07` as a target, but the adapter rejects it. Merely changing
the meta-schema URI would produce a misleading artifact because reusable
definitions, references, and tuples use different keywords in the two drafts.

## Proposal

`toJsonSchema()` gains an additive `target` option:

```ts
toJsonSchema(schema, { target: "draft-2020-12" });
toJsonSchema(schema, { target: "draft-07" });
```

An explicit target selects both the renderer and, unless `schema` overrides
it, the official meta-schema URI. The existing `schema` option remains an
exact `$schema` override. Recognized official Draft 7 and Draft 2020-12 URIs
also select their matching renderer when `target` is omitted, preserving the
CLI's existing URI-based interface. A conflicting explicit target and known
official URI throws `TypeError` rather than emitting a mislabeled artifact.

Draft 2020-12 continues to use `$defs`, `#/$defs/...`, and `prefixItems`.
Draft 7 uses `definitions`, `#/definitions/...`, and tuple `items` with
`additionalItems: false`. All other currently emitted validation and annotation
keywords retain their existing exact semantics.

`createStandardJsonSchema()` accepts both `draft-2020-12` and `draft-07` and
delegates to the same dialect-aware renderer. OpenAPI 3.0 and unknown future
targets remain explicit errors.

## Compatibility

Calls without `target` or a recognized Draft 7 URI retain the current Draft
2020-12-shaped output. Existing explicit `$schema` values are preserved.
`target` is additive, and the Standard JSON Schema adapter adds a previously
unsupported target.

## Non-Goals

- OpenAPI 3.0 conversion.
- Draft 2019-09 or drafts older than Draft 7.
- Guessing a dialect from arbitrary custom `$schema` URIs.
- Approximating opaque transform output.
