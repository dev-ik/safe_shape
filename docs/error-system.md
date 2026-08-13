# Error System

Issue model: code, path, expected, received, message, suggestion.

## Issue Codes

Current issue codes:

- `invalid_type`
- `invalid_literal`
- `invalid_tuple_length`
- `invalid_union`
- `transform_failed`
- `missing_property`
- `unexpected_property`
- `custom`

Issues are immutable and preserve path segments as strings and numbers.

Diagnostic helpers convert issues into stable human-readable output without changing the
underlying issue model.
