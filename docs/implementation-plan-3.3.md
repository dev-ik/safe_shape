# SafeShape 3.3: checked output contracts and runtime efficiency

**English** | [Русский](ru/implementation-plan-3.3.md)

Status: implemented; versioned 3.3.0 candidate, not published. Final release
qualification is pending. The mission is to build the best
runtime contract platform for TypeScript, with correctness before performance,
immutable schemas, rich diagnostics and stable APIs.

## Scope and implementation order

1. Record RFC 0049 and ADR 0037. Retain existing exact graph/snapshot behavior;
   add explicit output bounds for checked pipelines, JSON Schema export and
   live producer/consumer analysis. Never infer producibility from a bound.
2. Profile and optimize repeated async discovery and no-check traversal. Keep
   public Error identity, stacks, issue trees, warnings and frozen containers.
3. Cover output bounds, recursion, async detection, conservative connection
   results and exports with runtime/type tests and an installed consumer journey.
4. Update current English documentation and translate all current user guides,
   API references and operational guides into Russian. Keep code examples and
   defaults aligned; enforce the translation inventory in docs checks. Historical
   release evidence and normative RFC/ADR archives remain explicitly labelled EN.
5. Run package tests, typecheck, build, docs/examples/consumer/migration checks,
   performance measurements and the release gate. Record failures and limitations.

## Acceptance

- No breaking API, snapshot or default-export changes.
- A checked string-to-number pipeline can export an explicit numeric output
  bound and prove that its successful outputs fit a wider native consumer.
- A non-contained bound produces manual review, never a fabricated emitted
  counterexample. Opaque final transforms remain unsupported.
- Comparisons retain immutable reports and execute no transform/refinement
  callbacks. Lazy getters may resolve as with existing introspection.
- Paired performance samples use unchanged quality workloads and budgets;
  improved workloads and remaining Zod gaps are both reported. No parity claim
  follows merely from passing regression budgets.
- Russian navigation leads to Russian current documentation. New public APIs
  have matching EN/RU examples and tests. An inventory guards missing pages and
  source drift; automated checks do not establish translation quality.
- Independent developer walkthrough remains a human release qualification;
  automated journeys are recorded separately.

Broad format/default/codec expansion is deferred until concrete adoption
evidence warrants a separately specified capability. Publication is a separate
step after qualification.
