# Migrating from SafeShape 2.x to 3.0

**English** | [Русский](ru/migration-2-to-3.md)

SafeShape 3.0 combines the completed 2.1 form/recovery work with Diagnostics
v2 and explicit asynchronous parsing. Upgrade every installed SafeShape
package to the same major before updating application code.

```sh
npm install safe-shape@3
# or
npm install @safe-shape/core@3 @safe-shape/http@3 @safe-shape/validation@3
```

## Required source updates

Native `Issue` objects now contain `severity: "error"`. Update exact snapshots,
strict decoders, and manually authored `Issue` values. The old formatted
`Diagnostic` type is now `FormattedDiagnostic`; `Diagnostic` means the native
`Issue | Warning` union.

Custom refinement failures now retain their stable `id` as `ruleId`. Code that
compares complete issue objects must include it.

Successful results still have the familiar `{ success: true, data }` shape
when there are no warnings. A warning-producing parse adds a frozen `warnings`
array. Failures expose warnings on `error.warnings`:

```ts
const result = schema.safeParse(input);

if (result.success) {
  render(result.data);
  showWarnings(result.warnings ?? []);
} else {
  showErrors(result.error.issues);
  showWarnings(result.error.warnings);
}
```

`parse()` remains data-only and ignores successful warnings. Use `safeParse()`
where warning handling matters.

## Warning rules and parameters

Use `warn()` for one warning and `warnWithDiagnostics()` for an ordered
collector. Warning and collector rules require stable ids. `params` accepts
only copied JSON-safe values; values are frozen and limited to 20 levels,
1,000 entries, and 16,384 serialized characters.

```ts
const name = string().warn((value) => value.length >= 3, {
  id: "name.short/v1",
  message: "Name is unusually short.",
  params: { recommendedMinimum: 3 },
});
```

Format native warnings with `formatWarnings()` or mixed native diagnostics
with `formatDiagnostics()`. Per-call formatters receive the native diagnostic,
including `severity`, `ruleId`, and `params`; no global locale state is used.

## Async rules

Use `refineAsync()`, `refineAsyncWithDiagnostics()`, `warnAsync()`, or
`warnAsyncWithDiagnostics()` only for callbacks that return promises. Parse
such schemas with `safeParseAsync()` or `parseAsync()`.

Synchronous parsing detects nested async rules before parsing and throws a
deterministic `TypeError`. Async rules and nested members execute sequentially
in declaration/input order. Rejections become fatal diagnostics without
including the rejection value.

First-party boundaries have matching async APIs:

- `validateSchemaAsync()`;
- HTTP contract `safeParseRequestAsync()` / `parseRequestAsync()` and response
  equivalents;
- standalone `safeParseHttpRequestAsync()`, `parseHttpRequestAsync()`, response
  equivalents, and `recoverHttpResponseAsync()`;
- CLI `schema validate`, which automatically awaits async schemas.

Standard Schema validation stays synchronous for fully synchronous schemas
and returns a promise for schemas containing async work. Its optional
SafeShape-specific `warnings` extension may be ignored by generic consumers.

## Contract artifacts

Opaque warning and async identities are encoded in the existing ordered
`refinements` list as `warning:<id>`, `async-error:<id>`, and
`async-warning:<id>`. Existing synchronous error refinement ids keep their
2.x representation. JSON Schema export rejects these opaque behaviors rather
than emitting a weaker schema.

After migration, run typecheck, tests, contract comparison against reviewed
baselines, CLI fixtures, and the SafeShape consumer/release checks. Review
snapshot changes; do not regenerate production baselines blindly.
