# Diagnostics

Errors must explain what, where, why and how to fix.

## v0.3 Public API

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
