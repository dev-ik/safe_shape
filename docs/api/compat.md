# Contract Compatibility

`@safe-shape/compat` creates deterministic contract snapshots and compares
contract versions conservatively.

## Snapshots

```ts
import { object, string } from "@safe-shape/core";
import { createContractSnapshot } from "@safe-shape/compat";

const userSchema = object({ id: string() });
const snapshot = createContractSnapshot(userSchema, { id: "user" });
```

Snapshots contain:

- format `safe-shape.contract/v1`;
- a stable contract id;
- a canonical, JSON-safe contract tree;
- a `sha256:` fingerprint of that tree.

Object properties and required-property lists have deterministic ordering.
`title` and `description` annotations are preserved. Metadata `examples` are
excluded so snapshot files do not contain sample payloads by default.

Snapshot format v1 is tree-shaped and therefore rejects `lazy()` references.
Its public APIs remain available for existing baselines and retain their exact
format and fingerprint behavior.

Use `parseContractSnapshot(value)` for JSON read from disk or another untrusted
boundary. It validates the format and contract tree, reconstructs immutable
containers, and rejects fingerprint mismatches.

## Graph Snapshots v2

Use the explicitly versioned APIs for recursive schemas and independent input
and output fingerprints:

```ts
import { lazy, object, optional, type Schema } from "@safe-shape/core";
import {
  createContractSnapshotV2,
  parseContractSnapshotV2,
} from "@safe-shape/compat";

interface Node {
  readonly next?: Node;
}

let nodeSchema: Schema<Node>;
nodeSchema = lazy(
  () => object({ next: optional(nodeSchema) }),
  { id: "Node" },
);

const snapshot = createContractSnapshotV2(nodeSchema, { id: "node" });
snapshot.format;             // "safe-shape.contract/v2"
snapshot.input.fingerprint;  // input graph
snapshot.output.fingerprint; // output graph
snapshot.fingerprint;        // both graphs together
```

Each graph contains a `root` and a sorted `definitions` record. References use
stable lazy ids. Output transforms that cannot be recovered structurally remain
explicit `opaque` nodes rather than being approximated.

V2 fingerprints hash compact canonical JSON: object keys are sorted at every
depth, definition and required-property names are sorted, and semantically
ordered tuple and union arrays retain their order. The contract id and stored
fingerprint fields are excluded from the semantic hash.

`parseContractSnapshotV2()` validates all three fingerprints, rebuilds frozen
containers, rejects missing reference targets, and rejects definitions that are
not reachable from the root.

### Migrating from v1

V1 and v2 are separate formats and APIs. Existing callers can keep
`createContractSnapshot()` and `parseContractSnapshot()` unchanged while adding
new v2 baselines. Do not replace a reviewed v1 file in place unless the
repository intentionally accepts a new baseline.

Use the explicit v2 comparison APIs for graph contracts:

```ts
import {
  compareContractsV2,
  compareContractSnapshotsV2,
} from "@safe-shape/compat";

const inputReport = compareContractsV2(previousSchema, nextSchema, {
  id: "node",
  compatibility: "backward",
});

const outputReport = compareContractSnapshotsV2(previousSnapshot, nextSnapshot, {
  side: "output",
  compatibility: "full",
});
```

`side` defaults to `input`. Reports include the selected `side` and use that
side's fingerprints. References resolve through their own graph definitions;
lazy ids and reuse topology are not runtime semantics. Recursive pairs are
checked coinductively, while every concrete container and member still uses the
normative compatibility rules.

Stable matching opaque output ids are safe declarations of unchanged behavior.
Anonymous or changed opaque output ids remain `unknown`. V1 and v2 comparison
APIs stay separate and do not reinterpret one snapshot format as the other.

## Compare Runtime Contracts

```ts
import { compareContracts } from "@safe-shape/compat";

const report = compareContracts(previousSchema, nextSchema, {
  compatibility: "backward",
});
```

Compatibility modes define which accepted-value relationship must be proven:

- `backward`: every value accepted by the previous schema is accepted by the
  next schema;
- `forward`: every value accepted by the next schema is accepted by the
  previous schema;
- `full`: both directions.

`compareContractSnapshots(previous, next, options)` performs the same analysis
for stored snapshots. Snapshot ids must match; mismatched ids produce an
`unknown` report.

`compareContractsV2()` and `compareContractSnapshotsV2()` apply the same modes
to a selected input or output Contract IR graph. Recursive findings retain
semantic schema paths rather than exposing definition-table storage paths.

## HTTP Presentation

Use `createHttpCompatibilityPresentation()` when a compatibility result is
shown for an HTTP request or response:

```ts
import {
  compareContractsV2,
  createHttpCompatibilityPresentation,
} from "@safe-shape/compat";

const report = compareContractsV2(previousBody, nextBody, {
  compatibility: "backward",
});

const presentation = createHttpCompatibilityPresentation(report, {
  exchange: "request",
});

presentation.producer; // "client"
presentation.consumer; // "server"
presentation.focus;    // "consumer"
```

For requests, the client is the producer and the server is the consumer. For
responses, the server is the producer and the client is the consumer.
Backward findings describe consumer compatibility, forward findings describe
producer compatibility, and full mode presents both.

The immutable presentation retains status, fingerprints, the optional v2
`side`, and each original finding. It only adds transport terminology and does
not change the compatibility proof.

## Migration Diagnostics

Use `createMigrationDiagnostics()` to turn a compatibility report into an
immutable, JSON-friendly migration decision without changing its proof:

```ts
import {
  compareContracts,
  createMigrationDiagnostics,
} from "@safe-shape/compat";

const report = compareContracts(previousSchema, nextSchema, {
  compatibility: "backward",
});
const migration = createMigrationDiagnostics(report);

migration.decision;             // "compatible" | "migration-required" | "manual-review"
migration.migrationRequired;    // true only for a breaking report
migration.manualReviewRequired; // true for risky or unknown reports
```

The result includes counts for every report status, a summary, and actionable
diagnostics for `breaking`, `risky`, and `unknown` findings. Each diagnostic
retains the stable finding code, path, direction, message, and optional
suggestion. Safe and annotation-only reports produce `compatible`; the helper
does not generate migrations or update a reviewed snapshot.

## Reports

Reports expose:

- `compatible`;
- `status`;
- requested `compatibility` mode;
- previous and next fingerprints;
- immutable `findings`.

Statuses are:

- `safe`: the requested relationship was proven;
- `breaking`: a counterexample class is known;
- `risky`: reserved for a credible but unproven compatibility risk;
- `unknown`: compatibility cannot be proven;
- `annotation-only`: only non-runtime annotations changed.

Each finding has a stable `code`, schema `path`, compatibility `direction`,
previous and next nodes, a message, and an optional suggestion.

The normative direction, node, object-shape, and unknown-property-policy rules
are listed in the [compatibility matrix](../compatibility-matrix.md).

The initial rules cover every current SafeShape schema kind, including strict
object property additions/removals, requiredness, literal widening, tuple
length, union choices, nullable/optional wrappers, records, transforms, and
refinements. Native string, number, integer, and array constraints are compared
as accepted-value sets, so widening and narrowing are direction-aware.

Snapshots preserve explicit `enum`, `unknown`, and `never` nodes. Enum changes
use directional finite-set containment: every source member must be accepted by
the target. Enum members also compare exactly with literals, constrained
primitives, and union choices. After opaque-behavior guards, a source `never`
is contained by every target, a target `unknown` contains every source, and
narrowing a source `unknown` is breaking.

Literal containment checks every native target constraint, including string
patterns and formats and numeric `multipleOf`. Opaque target behavior remains
`unknown` instead of being approximated.

Snapshots v1 and v2 also preserve `discriminatedUnion` and `intersection`
nodes. The parser revalidates discriminator structure and uniqueness when it
loads an artifact. Identical nodes compare as `safe`; unsupported structural
relationships remain conservative `unknown`.

String `pattern` and `format` constraints are preserved in both snapshot
formats. Snapshot parsing rejects invalid regex syntax and unknown format
names. Identical pattern/format values retain direction-aware length analysis;
changed values report `string.pattern.changed` or `string.format.changed` with
status `unknown` when accepted-value containment cannot be proven.

Number `multipleOf` and record key constraints are preserved and validated in
both snapshot formats. Compatibility proves direct decimal-lattice widening,
including removal of `multipleOf` or a target step that divides the source
step. Other changed lattices remain `unknown`. Record keys are compared with
the string rules at the synthetic `<key>` path; record values retain `*`.

Object snapshots preserve `reject`, `strip`, and `passthrough`. With an
unchanged shape, moving from a rejecting source to a permissive target is safe
in the accepting direction; the reverse is breaking. Changing between `strip`
and `passthrough` is breaking because extra-property output changes. Shape
changes under permissive policies use explicit input and output proofs: a
passthrough property may be added as universal identity `unknown`, narrower
properties are breaking, and opaque properties remain unknown. Removing an
identity-preserving property into passthrough is safe; transforms remain
unknown. The complete cases are in the compatibility matrix.

Fixed tuples compare positionally and also compare with homogeneous arrays.
Exact or effective lengths and every item relationship must be contained.
Union comparison proves breaking for uncovered finite values and inhabited
choices disjoint from every target branch, while possible collective coverage
remains `unknown`.

Cross-kind tuple/array findings use `tuple.array.changed`. A provably empty
target uses `contract.target.empty`; it is breaking only when source
inhabitation has a constructible proof, otherwise it remains `unknown`.

```ts
const previous = string({ minLength: 3, maxLength: 40 });
const next = string({ minLength: 1, maxLength: 80 });

compareContracts(previous, next, { compatibility: "backward" }).status;
// "safe"

compareContracts(previous, next, { compatibility: "forward" }).status;
// "breaking"
```

## Opaque Behavior

JavaScript refinement and transform functions cannot be reconstructed from a
snapshot. Anonymous opaque behavior therefore produces `unknown`.

Assign a stable semantic id when the behavior is intentionally versioned:

```ts
const userId = string().refine(isUserId, { id: "user-id/v1" });
const length = string().transform((value) => value.length, {
  id: "string-length/v1",
});
```

Equal ids are a caller assertion that contract semantics are unchanged. Change
the id whenever the accepted values or transform contract changes. Empty ids
are rejected.
