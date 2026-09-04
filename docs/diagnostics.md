# Diagnostics

Errors must explain what, where, why and how to fix.

## Public API

Diagnostics are derived from validation issues.

Each diagnostic contains:

- `code`
- `path`
- `message`
- `expected`
- `received`
- `suggestion`

The public diagnostics helpers are:

- `createDiagnostic(issue)`
- `createDiagnostics(issues)`
- `formatIssuePath(path)`
- `formatDiagnostic(diagnostic)`
- `formatIssues(issues)`
- `formatValidationError(error)`
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

`groupIssuesByPath()` groups by native structural path, preserves first-seen
path and issue order, and returns frozen copies of every container while
retaining the original issue objects. `toFieldErrors()` converts those groups
to form keys such as `users[0].email`; root issues use `_root` by default.
Distinct paths that format to the same key fail explicitly instead of
overwriting messages.

Ordinary-union branch diagnostics remain nested on their parent issue. Neither
projection chooses a best branch or flattens branch issues implicitly.
