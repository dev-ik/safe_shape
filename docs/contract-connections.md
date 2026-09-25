# Explicit producer and consumer connections

Development API for the next release; published 3.1.0 remains unchanged.

```ts
import { checkContractConnection, createContractSnapshotV2, enumeration, object } from "safe-shape";

const producer = createContractSnapshotV2(
  object({ state: enumeration(["active", "disabled", "paused"]) }),
  { id: "api@2" },
);
const consumer = createContractSnapshotV2(
  object({ state: enumeration(["active", "disabled"]) }),
  { id: "web@1" },
);
const report = checkContractConnection(producer, consumer);
// report.migration.decision === "migration-required"
// report.counterexample.value === { state: "paused" } when status is available
```

`checkContractConnection(producer: ContractSnapshotV2, consumer:
ContractSnapshotV2): ContractConnectionReport` validates both snapshots and
compares producer output containment in consumer input. Different ids are
expected: they identify the explicit parties, including versions when useful.
The tool does not discover deployed clients or infer service topology.

The immutable result contains:

- `producer` and `consumer`: id, selected side and original graph fingerprint;
- `compatible` and `status`: existing compatibility status semantics;
- `comparison`: findings with structural paths, source/target fingerprints and
  backward containment direction (producer is the source);
- `migration`: the existing actionable migration diagnostics;
- `counterexample`: `available` with `value` and a concrete `producerInput`, or
  `unavailable` with an explicit reason, including `unsupported-production`.

Every returned counterexample is rejected by the consumer and is the unchanged
output obtained by parsing `producerInput` through a reconstructible producer.
The initial search uses the candidate itself as that input. It is bounded and
incomplete: absence of such an input never establishes safety. Only JSON values
in the documented [counterexample domain](counterexamples.md) are constructed.

Output projection changes stripping object policies to reject extra emitted
properties. Union output bounds can include branches never selected at runtime;
if such a projected bound is incompatible but no producible witness is found,
the result requires manual review. Intersections may merge successful outputs,
so their production model is opaque. Transforms/pipelines and unsupported output
behavior never receive guessed witnesses. Recursive native graphs can retain
existing coinductive containment proofs without requiring witness construction.
Stable refinement ids remain author assertions, not callback equivalence proofs.

## CI manifest

Save reviewed v2 snapshots and create `connections.json`:

```json
{
  "version": 1,
  "connections": [
    { "name": "api-to-web-v1", "producer": "api-v2.json", "consumer": "web-v1.json" },
    { "name": "api-to-web-v2", "producer": "api-v2.json", "consumer": "web-v2.json" }
  ]
}
```

```sh
safe-shape --json contract check-connections --manifest ./connections.json > connections-report.json
```

Paths are manifest-relative; names are unique. The version and field sets are
validated before checking entries. Only `--manifest` and `--json` are accepted.
Files are snapshots, never executable schema modules. Baselines are read-only.
The JSON result includes `summary` (total, compatible, reviewOrMigration, errors)
and ordered per-connection `results`; successful checks contain a `report`, while
operational failures contain an `error`. Exit 0 means every connection is
compatible, 2 means migration/manual review, and 1 means an operational error.
Operational errors take precedence, retaining other entries' results. Invalid
manifests fail before producing a partial aggregate report.

Omit `--json` for a terminal report with both parties, the migration decision,
each diagnostic's structural path, reason and suggested action. For an
incompatible connection it also prints the confirmed producer input and emitted
value rejected by the consumer. An unavailable counterexample includes its
reason; absence of a witness is not proof of compatibility. JSON output and exit
codes are identical regardless of the text presentation.

Request connections run client output → server input; response connections run
server output → client input. Register each required version explicitly. Keep
baseline review and replacement separate from checking.
