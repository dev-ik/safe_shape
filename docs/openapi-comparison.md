# Compare OpenAPI documents

**English** | [Русский](ru/openapi-comparison.md)

SafeShape 4.0 compares two OpenAPI 3.0/3.1 documents directly. Keep your contracts
in YAML or JSON; no parallel set of manually maintained SafeShape schemas is needed.

```ts
import { readFile } from 'node:fs/promises';
import { compareOpenApi } from 'safe-shape'; // also @safe-shape/api

const report = compareOpenApi(
  await readFile('previous.openapi.yaml', 'utf8'),
  await readFile('next.openapi.yaml', 'utf8'),
);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.compatible ? 0 : 2;
```

The first document is the existing server contract; the second is its proposed
replacement. Operations match by HTTP method and path. The adapter imports used
schemas internally, and `@safe-shape/compat` proves value containment. Requests
must continue accepting old client values; responses must stay within what old
clients accept. For example, adding a required request property breaks compatibility;
adding an optional query parameter is safe. Removing an operation breaks compatibility.
The comparison also covers inherited parameters, bodies, JSON media types, response
headers and response status dispatch. No requests are sent to the API.

Read both parts of the immutable report:

- `findings`: operation changes and compatibility proofs, with endpoint and document paths.
- `issues`: document import problems or unsupported constructs, identified as previous/next.

`compatible` is true only when `decision` is `compatible`. `migration-required`
indicates a breaking change; `manual-review` means automatic proof is incomplete.
Import errors produce manual review with no partial findings. Do not treat an empty
finding list as proof if issues are present.

This release supports a documented OpenAPI subset. Local references and guarded
recursive schemas are supported; external references, oneOf, readOnly/writeOnly
projections, callbacks, webhooks and non-JSON bodies require review. Unsupported
assertions are reported instead of discarded. Authentication/server changes are
conservative manual-review findings. Unused component schemas are not compared.

Formats are rejected by default because OpenAPI annotations and runtime validators
can differ. Use `{ formatPolicy: 'annotation' }` when formats are documentation only,
or `{ formatPolicy: 'safe-shape' }` for SafeShape email/uuid/date/date-time semantics.
Annotation mode ignores format-only changes and does not enforce numeric widths.
The [API reference](api/api.md#direct-openapi-comparison-400) lists supported
constraints, limits and report types. The [runnable example](../examples/openapi-comparison.mjs)
checks both a breaking edit and the compatible reverse change.

The function accepts text or already parsed objects and performs no file/network I/O.
Direct document comparison is a JavaScript API; `safe-shape api check` continues to
compare SafeShape catalog snapshots.
