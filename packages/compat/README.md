# @safe-shape/compat

Deterministic contract snapshots and conservative compatibility analysis for
SafeShape runtime contracts.

```ts
import { object, string } from "@safe-shape/core";
import {
  compareContracts,
  compareContractsV2,
  createHttpCompatibilityPresentation,
  createMigrationDiagnostics,
  createContractSnapshot,
  createContractSnapshotV2,
} from "@safe-shape/compat";

const previous = object({ id: string() });
const next = object({ id: string(), label: string().optional() });

const snapshot = createContractSnapshot(previous, { id: "user" });
const graphSnapshot = createContractSnapshotV2(previous, { id: "user" });
const report = compareContracts(previous, next, { compatibility: "backward" });
const graphReport = compareContractsV2(previous, next, {
  compatibility: "backward",
  side: "input",
});
const requestPresentation = createHttpCompatibilityPresentation(graphReport, {
  exchange: "request",
});
const migration = createMigrationDiagnostics(report);
```

Native length, numeric range, and integer constraints are preserved in
snapshots and compared according to the requested compatibility direction.

Enum and literal changes use exact finite-value containment. Literal membership
checks native string pattern/format and numeric `multipleOf` constraints before
reporting `safe`. `never` is the bottom contract and `unknown` is the top
contract. See the normative
[compatibility matrix](../../docs/compatibility-matrix.md).

Snapshot v1 rejects recursive `lazy()` references explicitly. Use
`createContractSnapshotV2()` and `parseContractSnapshotV2()` for recursive
input/output graphs and their independent fingerprints. Use
`compareContractsV2()` or `compareContractSnapshotsV2()` to compare a selected
graph side. Input is the default; output must be selected explicitly.

Graph comparison resolves definitions coinductively and does not treat lazy ids
or definition-sharing topology as runtime semantics. Stable matching opaque
transform output ids are safe; changed or anonymous opaque output remains
`unknown`.

HTTP presentation maps the same proof into request/response,
producer/consumer, and client/server terminology. It accepts both v1 and v2
reports and does not add a dependency on `@safe-shape/http`.

Migration diagnostics project either report format into `compatible`,
`migration-required`, or `manual-review`. The immutable result includes status
counts, a summary, and actionable breaking/risky/unknown findings without
rewriting schemas or baselines.

Both snapshot formats preserve discriminated unions and intersections.
Identical nodes are safe; unsupported changed structures remain conservative
`unknown`.

String pattern and exact-format constraints are fingerprinted and validated
when snapshots are parsed. Changes remain conservative `unknown` when their
accepted-value relationship cannot be proven.

Exact numeric `multipleOf` and record key constraints are also preserved.
Obvious decimal-lattice and key widening is proven safe; relationships that
cannot be proven remain `unknown`.

Object snapshots retain `reject`, `strip`, and `passthrough`. Compatibility is
direction-aware and treats strip/passthrough output changes as breaking.

Fixed tuples compare with exact-length homogeneous arrays. Union removals use
finite or disjoint witnesses, and permissive object shape changes distinguish
universal identity properties from narrower or opaque behavior.

See [`docs/api/compat.md`](../../docs/api/compat.md) for the snapshot format,
compatibility modes, and report semantics.
