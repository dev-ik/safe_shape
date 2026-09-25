# Examples

Runnable examples for the built SafeShape CLI.

Consumer projects can install the full SafeShape package:

```sh
npm install safe-shape
```

Then import only what they use:

```ts
import { object, string, validateSchema } from "safe-shape";
```

Build the packages first:

```sh
npm run build
```

Export JSON Schema:

```sh
node packages/cli/dist/cli.js --json schema export \
  --module examples/user-schema.mjs \
  --export userSchema \
  --schema https://json-schema.org/draft/2020-12/schema
```

Validate JSON:

```sh
node packages/cli/dist/cli.js --json schema validate \
  --module examples/user-schema.mjs \
  --export userSchema \
  --input examples/valid-user.json
```

Generate TypeScript:

```sh
node packages/cli/dist/cli.js --json schema types \
  --module examples/user-schema.mjs \
  --export userSchema \
  --name User
```

Create and check a v2 contract baseline:

```sh
node packages/cli/dist/cli.js contract snapshot \
  --module examples/user-schema.mjs \
  --export userSchema \
  --id user \
  --format v2 \
  --out ./.tmp/user.contract.json

node packages/cli/dist/cli.js --json contract check \
  --module examples/user-schema.mjs \
  --export userSchema \
  --against ./.tmp/user.contract.json \
  --side input
```

The JSON check result includes a migration decision and actionable diagnostics.

Validate a production response, report contract drift, and recover only from a
fallback checked by `recoverHttpResponse()` through the same contract:

```js
import { readUserResponse } from "./resilient-http-response.mjs";

const state = readUserResponse(responseBody, responseStatus, {
  fallback: () => cachedResponse,
  report: (event) => telemetry.capture("contract_violation", event),
});
```

See [Production response recovery](../docs/production-response-recovery.md) for
the typed integration pattern and telemetry guidance.

Run the example smoke check:

```sh
npm run examples:check
```

## Contract Evolution

Run the complete recursive snapshot and migration workflow:

```sh
node examples/check-contract-evolution.mjs packages/cli/dist/cli.js
```

The runner checks both graph sides and safe, breaking, unknown, and operational
error outcomes while preserving baseline bytes. `contract-evolution.mjs`
exports the previous, widened, narrowed, and opaque schemas, plus an
application-owned `explainChange()` example combining migration diagnostics
with HTTP roles. See the [CI guide](../docs/ci.md) for consumer installation,
review decisions, and baseline replacement policy.

The same runner also exercises `contract check-many` with a generated manifest,
including a response producer change, a manual-review result, and an operational
error. The aggregate report is tested in workspace and installed consumers.
## Bounded scalar counterexamples

The contract-evolution runner also checks numeric and string-length input counterexamples through
the public API and opt-in single/batch CLI commands, composes migration and HTTP
presentations, and verifies that baseline bytes remain unchanged. It explicitly
checks the unavailable output-side result. See [supported domain](../docs/counterexamples.md).
The same installed-consumer runner includes a nested payload with arrays/unions
and exercises [Markdown review](../docs/contract-review.md) for single and mixed
batch outcomes.

## Next-release connected contracts

`node examples/connected-contracts.mjs packages/cli/dist/cli.js` exercises object
composition, checked query conversion, recursive declaration generation and a
producer/consumer CI manifest. It also runs against installed release tarballs.

## Production request boundary

[`production-boundary.mjs`](production-boundary.mjs) handles invalid requests, response drift and service failures with structured logging and controlled HTTP results. Throwing/rejecting loggers cannot fail the operation. [Guide](../docs/production-boundaries.md).
