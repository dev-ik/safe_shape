# SafeShape 3.2 — Explainable Contract Changes

Historical planning record. Publication of the combined scope is verified in
[the 3.1.0 release record](release-candidate-3.1.0.md); remaining checklists below
reflect their original development dates. Current work follows
[the completed 3.2.0 plan](implementation-plan-next.md) and
[its publication record](release-candidate-3.2.0.md).

Release sequencing decision (2026-09-11): this unpublished working scope is
included in the [3.1.0 candidate](release-candidate-3.1.0.md). The roadmap below
records development history; its publication hold and version statements are
superseded by the candidate record.

Status: finite composite counterexamples and Markdown review implemented; functional checks passed; performance qualification remains open.

Last updated: 2026-09-11

Implemented scope: [RFC 0045](../rfc/0045-contract-counterexamples.md),
[ADR 0032](../adr/0032-scalar-counterexample-validation.md), immutable snapshot
counterexamples, opt-in single/batch CLI output, independent runtime tests,
installed-consumer example, and a predeclared scalar benchmark budget.
See [usage and exact limits](counterexamples.md). M1–M3 are implemented for
this bounded domain; M4 final candidate CI and independent walkthrough remain
open. Versions remain 3.0.0 and publication remains on hold.
Local progress and checks: [development evidence](release-evidence-3.2.md).
The scalar domain now includes bounded native string-length witnesses under
[RFC 0046](../rfc/0046-string-length-counterexamples.md), including Unicode
runtime checks and an explicit construction-limit result.
The next implemented increment adds finite objects, arrays and ordinary unions,
plus [Markdown review artifacts](contract-review.md), under
[RFC 0047](../rfc/0047-composite-counterexamples-and-review.md). Qualification
of this increment is recorded separately in the development evidence.

Current M4 blocker: two quality runs exceeded unchanged performance budgets.
The first array-import miss did not reproduce in 15 diagnostic pairs or the
second full run, which instead exceeded tagged/record import and union valid
parse budgets. Investigate reproducibility and measurement conditions before
claiming qualification; do not discard the failed runs or loosen thresholds.
See [exact evidence](release-evidence-3.2.md). The counterexample-specific
operation budgets passed; stable candidate CI and independent walkthrough also
remain pending.

## Release Decision

The user requested continued development while withholding publication.
3.1 remains unpublished, and its [stable checklist](roadmap-3.1.md) stays open:
independent developer walkthrough, release notes and synchronized versions,
full verification of the final candidate in CI, and matching package archives.
Publication requires a later explicit instruction. Do not tag or publish a
release as part of this development plan.

3.2 is a working label for the next scope, not a version change or a claim that
3.1 shipped. Decide final release sequencing before preparing a candidate.

## Product Outcome

A developer can inspect a proven breaking change and, where construction is
supported, see a concrete value accepted by the source contract and rejected
by the target. The explanation preserves direction, input/output side, path,
and migration context. Unsupported construction is explicit.

This advances the mission: build the best runtime contract platform for
TypeScript. Zod remains an engineering-quality reference. Feature selection
follows contract evolution and diagnostic usefulness.

## M1 — Specify Counterexample Semantics

Write an RFC before adding public APIs or report fields. Start with finite
literal/enum domains and native numeric boundaries; select the exact supported
domain after checking existing proof rules and runtime semantics.

Specify source/target orientation for backward, forward, and full checks;
distinguish a complete root value from a local property example. Define an
explicit unavailable result for unsupported construction and resource limits.
Absence of a witness must never imply compatibility. A generated witness must
not upgrade or silently rewrite the existing compatibility report.

Keep opaque callbacks, arbitrary regular-expression synthesis, and general
recursive generation outside the initial guarantee. Output-side examples
require evidence about produced values; input acceptance alone is insufficient.
Snapshot-only analysis must not claim to execute unavailable runtime schemas.

Exit: reviewed examples and a finite support matrix define the public behavior,
determinism, JSON representation, immutability, and construction limits.

## M2 — Implement and Verify the Bounded Domain

Implement construction in the compatibility tooling layer, preserving core
package independence. Add an ADR if the design introduces a new architectural
boundary. Preserve snapshot formats, fingerprints, existing finding codes,
and default CLI output unless an RFC explicitly specifies an additive change.

For every supported witness, independently assert source acceptance and target
rejection with runtime schemas. Exercise both directions, equal contracts,
empty domains, number boundaries, and unsupported cases. Extend deterministic
generated tests to challenge witnesses and safe judgments in the same domain.

Exit: reproducible witnesses pass independent runtime assertions; unsupported
cases remain honest and bounded; no false-safe result in the recorded domain.

## M3 — Connect Explanations to the Project Workflow

Expose the accepted capability through documented programmatic composition and
an opt-in CLI surface specified by the RFC. Cover both single and multi-contract
checks, migration diagnostics, and HTTP request/response roles.

Use generated synthetic values only; never collect application payloads.
Keep baseline replacement an explicit reviewed action. Verify the full journey
from installed tarballs, including unavailable witnesses and unchanged baseline
bytes. Preserve existing exit-code semantics.

Exit: a runnable example explains a breaking change without requiring users
to interpret compatibility internals, with integration and consumer tests.

## M4 — Qualify the Final Scope

Carry forward the [quality contract](release-quality-3.1.md). Record the actual
comparison baseline, exact fixture versions, and budgets before measuring new
operations. Include witness-generation limits and latency in the evidence.
Run the full gate on the eventual versioned candidate; prior 3.1 results do not
qualify later code automatically. Repeat the independent walkthrough for the
new diagnostic journey before calling the release stable.

Exit: documented APIs, RFCs/ADRs where required, correctness and inference
checks, installed integrations, measured budgets, and candidate CI all pass.
Publication remains outside this development authorization.

## Deferred Scope

- Recursive TypeScript declarations: separate consumer-driven capability.
- Review formats beyond Markdown: only after a concrete CI consumer need.
- Automatic migration rewriting or baseline acceptance.
- Broad validation API expansion and speculative parser rewrites.

## Implementation Order

1. Inspect compatibility findings, containment rules, and runtime test helpers.
2. Add the counterexample RFC with supported and unavailable examples.
3. Add focused compatibility construction and independent runtime tests.
4. Add the specified CLI integration and stable-output regression coverage.
5. Add documentation, runnable examples, and installed-consumer coverage.
6. Add operation budgets and release evidence; run applicable quality gates.

Do not broaden construction support merely to increase feature count. A small,
verified domain is the acceptance target for this scope.
