# RFC 0003: errors

## Motivation

SafeShape validation failures need a stable data model that can support programmatic
handling and human-readable diagnostics.

## Proposal

Represent validation failures as immutable issues.

Each issue contains:

- `code`
- `path`
- `expected`
- `received`
- `message`
- `suggestion`

Current issue codes:

- `invalid_type`
- `invalid_literal`
- `missing_property`
- `unexpected_property`
- `custom`

Paths are stored as string and number segments so consumers can render them for different
targets.

## Alternatives

- Use plain strings only. This is rejected because consumers need stable issue codes and
  paths.
- Throw on the first issue only. This is rejected for v0.1 because object and array
  schemas can report multiple boundary problems in one parse result.

## Migration

No migration is required for v0.1 because no previous public error model exists.
