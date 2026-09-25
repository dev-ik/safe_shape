# Diagnostics

Errors must explain what, where, why and how to fix.

## Public API

Native `Diagnostic` is the union of error `Issue` and non-fatal `Warning`.
Both preserve structural paths. Formatting produces a `FormattedDiagnostic`
with a rendered path, without changing the native diagnostic.

Each diagnostic contains:

- `code`
- `path`
- `message`
- `expected`
- `received`
- `severity` (`error` or `warning`)

Optional `suggestion`, `ruleId`, immutable JSON `params` and ordered recursive
`branches` retain guidance, rule identity, structured context and union failures.

The public diagnostics helpers are:

- `createDiagnostic(issue)`
- `createFormattedDiagnostic(diagnostic)` for an issue or warning
- `createDiagnostics(issues)`
- `formatIssuePath(path)`
- `formatDiagnostic(diagnostic)`
- `formatIssues(issues)`
- `formatValidationError(error)`
- `formatDiagnostics(diagnostics, options?)`
- `formatWarnings(warnings, options?)`
- `groupIssuesByPath(issues)`
- `toFieldErrors(issues, options?)`

Paths are formatted from the root input:

- root path: `input`
- object property: `input.user.email`
- array index: `input.users[0].email`
- non-identifier property: `input["content-type"]`

Formatted diagnostics include:

- where the issue happened;
- what failed;
- what was expected;
- what was received;
- how to fix it when a suggestion exists;
- the stable issue code.

`formatIssues()` and `formatValidationError()` accept an optional per-call
message formatter. Their default output remains unchanged. The formatter is
also available to `toFieldErrors()` and is never stored globally or on a
schema.

Native success results expose optional `warnings`; failures retain warnings on
`result.error.warnings`. Use `formatWarnings()` for their presentation.
Warnings do not fail validation and are separate from `error.issues`. See the
[core diagnostic reference](api/core.md#warnings-and-async-rules) for constructors and
custom rule APIs.

`groupIssuesByPath()` groups by native structural path, preserves first-seen
path and issue order, and returns frozen copies of every container while
retaining the original issue objects. `toFieldErrors()` converts those groups
to form keys such as `users[0].email`; root issues use `_root` by default.
Distinct paths that format to the same key fail explicitly instead of
overwriting messages.

Ordinary-union branch diagnostics remain nested on their parent issue. Neither
projection chooses a best branch or flattens branch issues implicitly.
