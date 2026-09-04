# RFC 0040: Diagnostics v2

## Status

Accepted for SafeShape 3.0.

## Motivation

SafeShape 2.x issues can only fail parsing and expose some constraint data
through English strings. Applications need non-fatal warnings, structured
JSON-safe parameters, and deterministic localization without parsing text.

## Native Diagnostic Model

`Diagnostic` is the native immutable diagnostic shape. `Issue` and `Warning`
specialize it with `severity: "error"` and `severity: "warning"`.

Every diagnostic retains `code`, native structural `path`, English `message`,
`expected`, `received`, optional `suggestion`, and recursive union branches.
Custom diagnostics may also contain a stable `ruleId` and `params` composed of
JSON primitives, arrays, and objects. Parameters are copied, recursively
frozen, cycle-checked, and limited to a documented depth, entry count, and
serialized size. Keys named `__proto__` and similar names remain data.
Parameters must not contain response payloads or secrets by default.
The runtime limits parameters to 20 levels, 1,000 entries, and 16,384
characters in their serialized JSON representation. Accessors, cycles,
non-finite numbers, and non-plain objects are rejected.

Existing built-in codes remain closed. Applications do not mint arbitrary
codes; `ruleId` identifies custom semantics and `params` supplies formatter
data.

## Parsing Results

Successful native results may expose a frozen `warnings` array. It is omitted
when empty so ordinary 2.x success objects remain source- and shape-compatible.
Failures retain fatal issues on `ValidationError.issues` and any warnings
collected before or alongside failure on `ValidationError.warnings`.

Containers preserve deterministic declaration/input order. Warnings collected
by an unsuccessful ordinary-union choice stay inside that choice's recursive
diagnostics and are not promoted from a branch that was not selected. A
successful selected branch preserves its warnings. Intersections preserve
left then right warnings.

`parse()` remains a data-only convenience API. Applications that consume
warnings use `safeParse()`, validation reports, HTTP helpers, or CLI JSON.

## Schema API

Schemas add explicit synchronous `warn(predicate, options)` and
`warnWithDiagnostics(collector, { id })` methods. Their options mirror
addressable error refinements and allow structured `params`. Warning rules run
only after base parsing succeeds. Thrown callbacks become fatal deterministic
custom issues because a warning rule that did not execute cannot be trusted.

Existing `refine()` and `refineWithIssues()` accept structured parameters for
their generated custom errors while retaining their existing defaults.

## Boundary Propagation

- Validation success and failure reports expose warnings when non-empty.
- HTTP request/response parsing preserves native result warnings.
- Recovery states expose warnings from the value actually returned.
- CLI JSON validation includes warnings and exits `0` for valid input with
  warnings. Human output prints warnings without changing validation status.
- Standard Schema success/failure objects use an optional SafeShape extension
  field named `warnings`. Generic Standard Schema consumers may ignore unknown
  fields; SafeShape-aware consumers retain the warning channel.

## Formatting

Formatters consume stable diagnostic codes, severity, rule ids, and structured
parameters. Existing English messages remain the default. Formatter state is
per call; schemas and global process state never own locale.

## Compatibility

This is a major release because the native diagnostic type and result channels
expand. Existing 2.x code that only checks `success`, `data`, `error`, and
`issues` continues to work. A migration guide documents renamed formatted
diagnostic types and warning-aware exhaustive handling.

## Non-Goals

- Arbitrary application diagnostic codes.
- Mutable or process-global formatter registries.
- Sending diagnostic parameters to telemetry without application redaction.
- Treating warnings as Standard Schema failures.
