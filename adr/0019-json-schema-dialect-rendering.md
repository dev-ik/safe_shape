# ADR 0019: render JSON Schema from an explicit dialect context

## Status

Accepted.

## Context

Post-processing a Draft 2020-12 artifact into Draft 7 would need recursive
keyword and reference rewriting. That duplicates traversal semantics, risks
missing nested schemas, and makes future dialect-specific behavior difficult
to audit.

## Decision

The JSON Schema exporter resolves one dialect context before traversing
Contract IR. Every recursive conversion receives that context and emits the
correct definition container, reference prefix, and tuple representation at
the point where each schema node is created.

Both the direct exporter and Standard JSON Schema V1 adapter use this single
renderer. Core and Contract IR remain dialect-independent.

## Consequences

Each artifact is generated directly in its declared dialect without a lossy
rewrite pass. Adding another dialect requires an explicit reviewed renderer
branch. The context is internal, so the public surface remains limited to the
additive `target` option and existing Standard JSON Schema target value.
