# RFC 0039: form diagnostics and HTTP response recovery

## Status

Accepted for SafeShape 2.1.

## Motivation

SafeShape 2.0 preserves ordered immutable issues and recursive union branch
diagnostics, but applications still have to implement path grouping, form
projection, message formatting hooks, and production response fallback logic.
Those repeated adapters can lose issues, flatten union branches, introduce
field-key collisions, or accidentally trust an invalid response.

SafeShape 2.1 adds framework-neutral presentation and recovery primitives
without changing `Issue`, `ValidationError`, `ParseResult`, or schema behavior.

## Core Public API

`@safe-shape/core` adds:

```ts
interface IssueGroup {
  readonly path: readonly IssuePathSegment[];
  readonly issues: readonly Issue[];
}

type IssueMessageFormatter = (issue: Issue) => string;

interface FormatIssuesOptions {
  readonly formatMessage?: IssueMessageFormatter;
}

interface FieldErrorOptions {
  readonly formatMessage?: IssueMessageFormatter;
  readonly formatPath?: (path: readonly IssuePathSegment[]) => string;
  readonly rootKey?: string;
}

groupIssuesByPath(issues: readonly Issue[]): readonly IssueGroup[];
toFieldErrors(
  issues: readonly Issue[],
  options?: FieldErrorOptions,
): Readonly<Record<string, readonly string[]>>;
```

`formatIssues()` and `formatValidationError()` accept an optional
`FormatIssuesOptions`. Without options their output remains byte-for-byte
compatible with SafeShape 2.0. An external formatter replaces only the issue
message; paths, expected/received descriptions, suggestions, codes, and union
branch structure retain their existing rendering.

Grouping compares paths structurally and preserves first-seen path order and
issue order. Returned groups, copied paths, copied issue arrays, field message
arrays, and records are frozen. Original issue objects are retained rather than
translated or mutated.

`toFieldErrors()` uses form paths without the diagnostic `input` prefix:
`["owner", "contacts", 0, "email"]` becomes
`owner.contacts[0].email`. Non-identifier keys use bracketed JSON string
notation. The default root key is `_root`.

Ordinary union branch trees remain attached to their top-level issue and are
not flattened or assigned to a guessed field. Applications may explicitly
project branch issues in a separate call.

Two structurally different paths must not silently overwrite one another. If
the root key or a custom/default path formatter maps distinct groups to the
same field key, `toFieldErrors()` throws `TypeError`. Formatter results and
field keys must be strings; field keys must be non-empty. Prototype-like keys
such as `__proto__` are stored as ordinary own properties.

## HTTP Public API

`@safe-shape/http` adds:

```ts
type HttpResponseRecoveryOptions =
  | { readonly status?: number; readonly fallback: unknown; readonly getFallback?: never }
  | { readonly status?: number; readonly getFallback: () => unknown; readonly fallback?: never };

type HttpResponseRecoveryResult<T> =
  | { readonly kind: "valid"; readonly data: T }
  | {
      readonly kind: "recovered";
      readonly data: T;
      readonly networkError: ValidationError;
    }
  | {
      readonly kind: "unavailable";
      readonly networkError: ValidationError;
      readonly fallbackError: ValidationError;
    };

recoverHttpResponse(contract, input, options): HttpResponseRecoveryResult<...>;
```

The network input is validated first. A valid result never evaluates
`getFallback`. After a network failure, the eager `fallback` or lazy
`getFallback()` result is validated through the same contract and status.
Successful fallback parsing returns only parsed data. Failed network and
fallback payloads are never exposed as inferred output values.

Every returned recovery state is frozen. Existing immutable
`ValidationError` instances are retained for local diagnostics. Telemetry,
redaction, cache storage, retries, and UI policy remain outside the helper.
Exceptions thrown by application-owned `getFallback()` callbacks propagate;
applications that read fallible storage must contain that behavior inside the
callback and return an `unknown` fallback value.

## Package Boundaries

- Grouping, projection, and formatting stay in `@safe-shape/core`.
- Response recovery stays in `@safe-shape/http`, which already depends on core.
- The `safe-shape` umbrella package re-exports both surfaces.
- No new dependency direction or package is introduced, so no ADR is required.

## Compatibility

All APIs and optional parameters are additive. Default diagnostic output,
synchronous parsing, schema inference, Standard Schema behavior, and existing
HTTP helpers remain unchanged. The release is compatible with the SafeShape
2.x result model.

## Non-Goals

- Framework-specific form adapters.
- Implicit flattening or best-branch selection for ordinary unions.
- Schema-owned locales or global formatter registration.
- Structured diagnostic parameters, warning severity, or successful results
  with warnings.
- Async parsing or async refinements.
- Cache, retry, telemetry, or UI state management.
