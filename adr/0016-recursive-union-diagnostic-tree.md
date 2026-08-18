# ADR 0016: represent union failures as a recursive diagnostic tree

## Status

Accepted.

## Context

Flattening every failed union branch into the top-level issue list loses branch
identity and makes identical paths ambiguous. Keeping only a summary loses the
actionable validation evidence. Choosing one "best" branch introduces unstable
heuristics and hides valid alternatives.

## Decision

Keep one stable `invalid_union` summary issue and attach an ordered recursive
`branches` tree. Each branch is identified by its declaration index and owns
its complete issue list. Diagnostics and JSON validation reports preserve the
tree; human formatting renders it with indentation.

Branch containers are immutable and JSON-safe. Successful unions continue to
short-circuit, so branch evidence exists only when the whole union fails.

## Consequences

Callers can explain every alternative without re-validating input, nested
unions remain unambiguous, and the existing top-level issue contract survives.
Failure payloads become larger in proportion to the number and complexity of
failed branches; this cost is accepted in favor of rich diagnostics.
