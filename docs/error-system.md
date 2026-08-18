# Error System

Issue model: code, path, expected, received, message, suggestion, and optional
recursive union branches.

## Issue Codes

Current issue codes:

- `invalid_type`
- `invalid_literal`
- `invalid_enum`
- `invalid_string_pattern`
- `invalid_string_format`
- `forbidden_value`
- `invalid_tuple_length`
- `invalid_union`
- `invalid_discriminator`
- `intersection_conflict`
- `too_small`
- `too_large`
- `not_integer`
- `not_multiple_of`
- `transform_failed`
- `missing_property`
- `unexpected_property`
- `custom`

Issues are immutable and preserve path segments as strings and numbers.

Opaque application rules use `custom`. Ordinary `refine()` can attach its one
issue to a relative path. `refineWithIssues()` can add multiple custom issues
at distinct relative paths; declaration order and collector insertion order
are preserved. Nested schemas and HTTP helpers prepend their existing paths,
and every resulting issue/path container remains frozen.

An `invalid_union` issue includes an ordered `branches` array when all ordinary
union choices fail. Every entry has the zero-based choice `index` and that
choice's complete immutable issue list. Paths remain rooted at the original
input, and nested unions preserve nested branch trees. SafeShape does not guess
which failed branch is the most relevant and does not flatten branch failures.

`invalid_discriminator` points at the tagged property of a discriminated union.
Once a branch is selected, its original issues are returned without collapsing
them into a generic union error. `intersection_conflict` means both schemas
validated but produced outputs that could not be combined safely.

`invalid_string_pattern` means a string failed its declared ECMAScript pattern.
`invalid_string_format` means it failed one of SafeShape's exact `email`,
`uuid`, `date`, or `date-time` validators. These issues can appear together
with length issues for the same path.

`not_multiple_of` means a finite number failed exact base-10 divisibility for
its declared positive `multipleOf`. Record key constraints reuse the string
issue codes and place the actual key in the diagnostic path; value issues are
not suppressed when the key also fails.

Diagnostic helpers preserve the recursive branch tree in `Diagnostic` objects.
Human-readable output renders the stable union summary followed by indented
`Union branch N:` sections without changing the underlying issue model.
