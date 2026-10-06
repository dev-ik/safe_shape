# @safe-shape/api

**English** | [Русский](https://github.com/dev-ik/safe_shape/blob/v3.5.1/packages/api/README.ru.md)

Endpoint catalogs, validated fetch clients, OpenAPI 3.1 and API compatibility.

See the [API reference](https://github.com/dev-ik/safe_shape/blob/v3.5.1/docs/api/api.md). Browser consumers use
`@safe-shape/api/client`; Node tooling uses the root entry.

Introduced in SafeShape 3.4.0. Existing runtime APIs and snapshot defaults remain compatible.

## Quick start

```sh
npm install @safe-shape/api @safe-shape/core
```

```js
import {
  httpEndpoint, apiContract,
} from "@safe-shape/api";
import { object, string } from "@safe-shape/core";

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
import { createApiClient, toOpenApi, createApiSnapshot, compareApiSnapshots } from "@safe-shape/api";
import { api } from "./api.mjs";

const client = createApiClient(api, { baseUrl: "https://api.example.com/v1" });
const result = await client.getUser({ params: { id: "user_1" } });
if (result.success && result.status === 200) console.log(result.data.id);

const openapi = toOpenApi(api, { title: "Users", version: "1.0.0" });
const baseline = createApiSnapshot(api);
const comparison = compareApiSnapshots(baseline, createApiSnapshot(api));
console.log(openapi.openapi, comparison.decision); // 3.1.0, compatible
```

The client calls an existing HTTP server. Requests and responses are validated, and response data is inferred by status. For browsers use `@safe-shape/api/client`; OpenAPI and snapshot tools use the Node root entry. JSON transport only: no router, cookies, multipart or retries. See the [full reference](https://github.com/dev-ik/safe_shape/blob/v3.5.1/docs/api/api.md) for supported wire schemas, warnings, cancellation and compatibility rules.
