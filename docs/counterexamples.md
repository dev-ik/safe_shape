# Contract counterexamples

Introduced in 3.1.0. See the [release status](release-candidate-3.1.0.md).

`createContractCounterexamples(previousSnapshot, nextSnapshot, options?)` from
`@safe-shape/compat` (also `safe-shape`) returns deeply immutable synthetic root examples.
Both snapshots must have the same format, v1 or v2. Options are `compatibility`
(`backward` by default, `forward`, or `full`) and `side` (`input` by default).

```js
import { number, createContractSnapshotV2, createContractCounterexamples } from "safe-shape";

const previous = createContractSnapshotV2(number({ minimum: 0 }));
const next = createContractSnapshotV2(number({ minimum: 1 }));
const examples = createContractCounterexamples(previous, next);
// [{ direction: "backward", side: "input", source: "previous", target: "next",
//    path: [], status: "available", value: 0 }]
```

Changing `string({ minLength: 2 })` to `string({ minLength: 3 })` produces the
backward witness `"aa"`: it passes the previous contract and fails the next.
Widening the bound produces a witness in the forward direction instead.

For backward checks the source is previous and the target is next; forward
reverses them. Full returns both in that order. A returned value is accepted by
the source and rejected by the target within the supported snapshot semantics.
Every example is a complete root value, not a fragment at a finding path.

Keep the original comparison report, migration diagnostics, and HTTP role
presentation alongside these examples. Examples do not modify those reports,
prove the absence of breakage, or locate actual deployed consumers.

## Supported domain

JSON scalar literal, enum, boolean, number (native constraints), string with
native `minLength`/`maxLength`, unknown, and never; finite objects, arrays,
ordinary unions, optional and nullable wrappers around these nodes.
Object policies and optional property absence are preserved. Refinements,
special encoded literals (including negative zero), string pattern/format rules,
references, discriminated unions, tuples, intersections and transforms are
unsupported. Output-side construction is unavailable: validating a possible
output alone would not prove that a producer can emit it.

Search tries scalar values from both roots and numeric bounds, adjacent IEEE-754
values, rounded bounds, then a fixed scalar seed set. It checks at most 128
candidates per direction. That limit covers candidate validation, not snapshot
parsing or the byte size of scalar strings/enums. Numeric synthesis is not
exhaustive, particularly for combinations of `multipleOf` and bounds.

For string roots the search generates `a` and `b` repetitions at lengths zero,
one, and each bound with adjacent nonnegative lengths. A generated string is
limited to 1,024 code points; larger lengths are skipped before allocation.
Runtime validation counts Unicode code points, including for supplied Unicode
literal/enum candidates. The synthesis cap does not truncate or limit those
supplied values. Search is not exhaustive over strings excluded by finite enums.

An unavailable result replaces `value` with `reason`:

| Reason | Meaning |
| --- | --- |
| `unsupported-side` | Output production is outside the supported domain. |
| `unsupported-domain` | At least one root cannot be reconstructed faithfully. |
| `candidate-limit` | Search exhausted its 128-attempt limit. |
| `construction-limit` | Schema, candidate pool, synthesized length, expanded value size or local search budget was exceeded. |
| `no-witness-found` | The bounded candidate set contained no witness. |

None means the contracts are compatible. Invalid snapshots, mixed formats, or
invalid options throw. The exported types are `ContractCounterexample`,
`CounterexampleValue`, and `CounterexampleUnavailableReason`.

A found witness takes precedence over skipped lengths; reaching the validation
attempt limit returns `candidate-limit`. The new `construction-limit` reason
extends the unpublished result union; exhaustive consumers should handle it.
See [RFC 0046](../rfc/0046-string-length-counterexamples.md).

## Objects, arrays and unions

The generator builds a valid source seed, then varies one field or array item
at a time using candidates from both contracts. Union branches are searched in
order. Every result is validated against both whole roots before it is returned.
For example, a required-property addition can return `{}`, and changing a
nested name length can return `{ "user": { "name": "aa" } }`.
Property names such as `__proto__` remain own JSON properties. All returned
arrays and objects are deeply frozen. `CounterexampleValue` now includes
recursive JSON arrays/objects; consumers of the unpublished scalar-only type
must handle these new variants.

Per-direction limits from [RFC 0047](../rfc/0047-composite-counterexamples-and-review.md):

| Resource | Limit |
| --- | --- |
| Schema depth | 4, root at zero |
| Schema nodes | 128 per reconstructed root |
| Object properties / union branches | 16 / 8 |
| Generated array length | 16 |
| Retained local candidates | 16 per pool |
| Local candidate evaluations and generator entries | 4,096 shared work units |
| Root candidates | 128 |
| Expanded composite value nodes | 1,024 |
| Composite string values and keys | 65,536 UTF-16 code units total |

Expanded-size limits are checked before root validation and serialization and
count shared subtrees once per occurrence. Standalone supplied scalar literals
retain their existing semantics. Noncanonical required/optional combinations in
external snapshots are unsupported. The search does not enumerate a Cartesian
product: some multi-field or collective union cases can remain unavailable.
An unavailable example never changes the original compatibility judgment.

## CLI

```sh
safe-shape --json contract check --module ./amount.mjs --against ./amount.json --counterexamples
safe-shape --json contract check-many --manifest ./contracts.json --counterexamples
```

The boolean flag adds `counterexamples` to the single report or each evaluated
batch entry. Text output includes directional values or unavailable reasons.
Omitting the flag (or using `--counterexamples=false`) preserves default output.
Manifest format, migration decisions, exit codes, and baselines are unchanged.
For v2 output checks the field explicitly reports `unsupported-side`.
Add `--markdown` for a [review artifact](contract-review.md).

Run `node examples/check-contract-evolution.mjs packages/cli/dist/cli.js` after
building for a complete example, also exercised from installed release archives.

## Verification budget

Before initial measurement, the scalar fixture budget is set to 10,000 calls
within 5 seconds, including validated snapshot parsing and outcome assertions,
after warmup. `npm run benchmarks:check` enforces it and records the timing.
The string length fixture has the same separate 10,000-call / 5-second budget.
The composite fixture has a predeclared 1,000-call / 5-second budget.
This is a workflow guard for this fixture, not a universal latency guarantee or
a comparison against Zod. Existing release quality budgets still apply.
