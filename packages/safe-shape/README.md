# safe-shape

**English** | [Русский](https://github.com/dev-ik/safe_shape/blob/v3.5.0/packages/safe-shape/README.ru.md)

Runtime contracts for TypeScript: validate unknown data, infer types, export schemas, and check API compatibility through one dependency.

Version 3.5.0 adds AI contracts and MCP through the separately installed `@safe-shape/mcp` package. The umbrella runtime remains compatible. Node >=20.10 and ESM are required.

Since 3.3.0, the package also re-exports `describeOutputBound()` and `checkSchemaConnection()`;
see [checked output bounds](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/checked-output.md).

Install this package when a project wants the runtime and tooling surface available
through one dependency:

```sh
npm install safe-shape
```

Import only the helpers needed by each module:

```ts
import { object, string, validateSchema } from "safe-shape";

const userSchema = object({
  id: string(),
});

const report = validateSchema(userSchema, { id: "user_1" });
```

## API workflow

Define an immutable endpoint catalog, validate requests before fetch and responses after decoding, export OpenAPI 3.1, and compare API snapshots. Added in 3.4.0 and retained in 3.5.0.

```js
import {
  object, string, httpEndpoint, apiContract,
} from "safe-shape";

export const api = apiContract({
  getUser: httpEndpoint({
    method: "get",
    path: "/users/{id}",
    request: { params: object({ id: string({ minLength: 1 }) }) },
    responses: {
      200: object({ id: string() }),
      404: object({ message: string() }),
    },
  }),
});

```

Keep the catalog in `api.mjs`. Call it from a separate module so CLI imports do not send HTTP requests:

```js
import { createApiClient, toOpenApi, createApiSnapshot, compareApiSnapshots } from "safe-shape";
import { api } from "./api.mjs";

const client = createApiClient(api, { baseUrl: "https://api.example.com/v1" });
const result = await client.getUser({ params: { id: "user_1" } });
if (result.success && result.status === 200) console.log(result.data.id);

const openapi = toOpenApi(api, { title: "Users", version: "1.0.0" });
const baseline = createApiSnapshot(api);
const comparison = compareApiSnapshots(baseline, createApiSnapshot(api));
console.log(openapi.openapi, comparison.decision); // 3.1.0, compatible
```

The client calls your existing server; SafeShape does not install a router. Path parameters and status-specific response data are inferred from the catalog. Invalid requests stop before transport. Declared 404 responses are typed results; validation, network and decoding failures have `success: false`. Warnings are retained, and each call accepts `{ signal }` as its second argument.

For browsers, import `apiContract`, `httpEndpoint` and `createApiClient` from `@safe-shape/api/client`, with schemas from `@safe-shape/core`. OpenAPI and snapshot tooling use the Node entry.

The transport supports JSON, string path parameters, scalar query fields and non-empty repeated-key arrays. Transforms, stripping objects, cookies, multipart, automatic retries and server routing are outside this workflow. See the [full API reference](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/api/api.md) and [runnable example](https://github.com/dev-ik/safe_shape/blob/v3.5.0/examples/api-workflow.mjs).

### CLI

Save a module exporting the catalog as `api.mjs`, then run:

```sh
npx safe-shape api export --module ./api.mjs --export api --title Users --version 1.0.0 --out ./openapi.json
npx safe-shape api snapshot --module ./api.mjs --export api --out ./api.contract.json
npx safe-shape --json api check --module ./api.mjs --export api --against ./api.contract.json
```

Check exit codes: 0 for compatible changes, 2 for migration or manual review, 1 for operational errors. Check reads the baseline without replacing it. See the [CLI reference](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/api/cli.md).

The umbrella export includes structured composition helpers such as
`discriminatedUnion()` and `intersection()` together with their snapshot and
generator support.
It also re-exports toolable string pattern and exact-format constraints.
Exact numeric `multipleOf` and constrained record keys are available through
the same umbrella export.
So are explicit `reject`, `strip`, and `passthrough` object policies.
Ordinary union failures also retain ordered recursive branch diagnostics through
the core, validation, and CLI exports.
Schemas also expose `refine(..., { path })` for one addressable issue and
`refineWithIssues(collector, { id })` for synchronous ordered multi-issue
custom rules.
Every schema implements Standard Schema V1 directly through `~standard`, and
the umbrella package re-exports the corresponding inference types.
Use the re-exported `createStandardJsonSchema()` when a consumer also requires
Standard JSON Schema V1 input/output conversion.
Use `safeToJsonSchema()` when build tooling needs structured diagnostics for
unrepresentable refinements or opaque output without catching exceptions.

## Composable and connected contracts

Since 3.2.0, use immutable object `pick`, `omit`, `partial`, `required`, `extend`
and `shape`, plus checked `pipe(next)` stages. `toTypeScriptType()` generates
recursive declarations with input/output side selection, and
`checkContractConnection()` checks producer-output to consumer-input v2 snapshots.
See [composition](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/composable-contracts.md),
[connections](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/contract-connections.md) and
[migration from Zod](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/migration-from-zod.md).

## Production Response Recovery

Use the re-exported `recoverHttpResponse()` helper to detect deployed response
drift and validate cached or constructed fallback data through the same HTTP
contract. It returns an immutable `valid`, `recovered`, or `unavailable` state
without treating either failed payload as trusted application data. Reporting,
storage, retry, and UI policy remain application-owned.

See the [Production Response Recovery
guide](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/production-response-recovery.md) for the typed flow,
telemetry guidance, and runnable example.

The package re-exports:

- `@safe-shape/core`
- `@safe-shape/compat`
- `@safe-shape/http`
- `@safe-shape/json-schema`
- `@safe-shape/typescript`
- `@safe-shape/validation`
- `@safe-shape/api`

Installing this package also installs `@safe-shape/cli`, which provides the
`safe-shape` CLI binary.

Use the scoped packages directly when a project wants the narrowest dependency
surface.

## AI contracts and MCP

Install `@safe-shape/mcp` separately for the local stdio server and validated
AI-tool boundaries. The umbrella does not depend on or re-export MCP.
See the [MCP guide](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/mcp.md).
