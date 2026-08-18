# RFC 0006: diagnostics

## Status

Accepted and retained for SafeShape 2.0.

## Motivation

Issues are structured for code. Diagnostics are formatted for people. SafeShape needs a
small formatting layer that explains what failed, where it failed, why it failed, and how
to fix it.

## Proposal

Expose diagnostics helpers:

- `createDiagnostic(issue)`
- `createDiagnostics(issues)`
- `formatIssuePath(path)`
- `formatDiagnostic(diagnostic)`
- `formatIssues(issues)`
- `formatValidationError(error)`

Issue paths are rendered from the root input:

- `input`
- `input.user.email`
- `input.users[0].email`
- `input["content-type"]`

Formatted diagnostics include the path, issue message, expected value description,
received value description, optional suggestion, and issue code.

## Alternatives

- Put only formatted strings on `ValidationError`. This is rejected because structured
  issues remain the stable programmatic API.
- Add colorized terminal output in core. This is deferred to CLI so core stays runtime
  focused and environment neutral.

## Migration

No migration is required for v0.3 because diagnostics are additive.
