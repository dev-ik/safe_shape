# SafeShape 3.3.0

**English** | [Русский](ru/release-3.3.0.md)

Status: local release candidate; not published. Remote CI on the final commit
and an independent developer walkthrough are still required.

## Changes

- `describeOutputBound(schema)` describes an upper bound on successful outputs,
  including the final checked stage of a pipeline.
- `checkSchemaConnection(producer, consumer)` proves connections from that bound
  to the consumer input. A bound that is not contained requires manual review;
  it does not prove that the producer emits an incompatible value.
- JSON Schema export accepts explicit `side: "output", mode: "output-bound"`.
  Safe export reports `json_schema.output.bound` as a warning. Exact mode remains
  the default; CLI and Standard JSON Schema conversion retain exact behavior.
- Runtime reuses completed async-discovery results and immutable results on
  layers without checks. Error identity, stacks and diagnostics are preserved.
- Current guides, API references and all eight package READMEs have Russian
  counterparts. Translation checks detect missing pages and reviewed-text drift.

See [checked output bounds](checked-output.md) for API examples and limitations,
and [development evidence](release-evidence-3.3.md) for measured performance.
The local fixtures show improvements, but do not establish parity with Zod.

## Upgrade from 3.2.x

No breaking public API, snapshot format or default behavior changes are intended.
Existing schemas and exact exporters need no migration. Opt in to output bounds
only when an upper bound is appropriate; opaque final transforms remain unsupported.

After publication, install `npm install safe-shape@3.3.0`, or update every scoped
SafeShape package you use to `3.3.0` together. Node.js >=20.10 and ESM are required.
Before publication, use the local tarballs prepared by `npm run prepare:release`;
the registry command is not a way to install this unpublished candidate.

## Release qualification

Run `npm run prepare:release` to execute the complete gate and create all eight
archives in `release-artifacts/`. Review the [release workflow](release.md) before
publishing. Local automated checks do not substitute for final-commit CI or the
independent developer walkthrough recorded in the [3.3 plan](implementation-plan-3.3.md).
