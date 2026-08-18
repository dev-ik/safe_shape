# RFC 0024: String patterns and exact formats

## Status

Accepted for the third production-core M3 slice.

## Motivation

Production contracts frequently constrain identifiers and wire-format strings.
Representing these rules as anonymous refinements hides them from Contract IR,
snapshots, JSON Schema, compatibility reports, and CLI artifacts.

## Proposal

Extend `StringConstraints`:

```ts
type StringFormat = "email" | "uuid" | "date" | "date-time";

interface StringConstraints {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly format?: StringFormat;
}
```

`pattern` is an ECMAScript regular-expression source compiled in Unicode mode
without caller-controlled flags. Invalid expressions fail eagerly with
`TypeError`. Runtime validation does not mutate regular-expression state and
does not coerce input.

The selected formats have deterministic SafeShape semantics:

- `email`: an ASCII dot-atom local part of at most 64 characters, one `@`, an
  ASCII DNS-style domain with labels of at most 63 characters, and a total
  length of at most 254 characters. Single-label domains are accepted. Quoted
  local parts, domain literals, comments, whitespace, Unicode, and
  internationalized email are rejected.
- `uuid`: the canonical `8-4-4-4-12` hexadecimal text form. Letter case and all
  version/variant bit patterns, including nil and max UUIDs, are accepted.
- `date`: a four-digit year and zero-padded `YYYY-MM-DD` with Gregorian calendar
  validation, including leap years.
- `date-time`: a valid SafeShape `date`, `T` or `t`, zero-padded 24-hour time
  with seconds, optional fractional seconds, and `Z`, `z`, or a numeric
  `±HH:MM` offset. Leap seconds and `24:00:00` are rejected.

Pattern failures produce `invalid_string_pattern`; format failures produce
`invalid_string_format`. Length, pattern, and format failures accumulate in
that order.

## Contract IR and Tooling

Pattern and format are immutable fields of the existing string constraint
node, so both Contract IR graphs and snapshot v1/v2 preserve them.

JSON Schema exports the standard `pattern` and `format` keywords. Exact format
grammar is also emitted as a companion pattern. When a caller supplies both a
pattern and a format, the caller pattern is emitted through `allOf` so neither
constraint is overwritten. Calendar validity remains represented by the
standard `date` or `date-time` format assertion.

TypeScript generation remains `string`; the constraints affect runtime values,
not the static primitive type. CLI export and validation inherit the runtime
and JSON Schema behavior.

## Compatibility

Identical pattern and format constraints continue through the existing
direction-aware string-length comparison. Any pattern or format change is
reported as `unknown` when accepted-value containment cannot be proven.
Snapshot parsers validate format names and pattern syntax at the trust
boundary.

This extension of the public `StringConstraints` contract is additive, while
new issue-code union members remain part of the deliberate 2.0 source surface.
It must not ship as 1.x.

## Security and Performance

Patterns are authored contract code, not untrusted runtime data. SafeShape does
not attempt to prove a regular expression safe from catastrophic backtracking.
Applications must not build schema patterns directly from untrusted input.

Built-in formats use bounded structural checks and do not depend on locale,
timezone databases, DNS, network access, or the platform date parser.

## Non-Goals

- Arbitrary regular-expression flags or stateful `RegExp` instances.
- Full RFC 5322 email syntax, SMTP deliverability, DNS lookup, or Unicode email.
- UUID version-specific builders.
- Leap-second tables, timezone-name resolution, or date/time coercion.
- Proving regular-language containment during compatibility analysis.
