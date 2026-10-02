import assert from "node:assert/strict";
import { apiContract, httpEndpoint, createApiClient, createApiSnapshot, compareApiSnapshots, toOpenApi, object, string } from "safe-shape";

export const api = apiContract({
  getUser: httpEndpoint({
    method: "get", path: "/users/{id}",
    request: { params: object({ id: string({ minLength: 1 }) }) },
    responses: { 200: object({ id: string() }), 404: object({ message: string() }) },
  }),
});
const client = createApiClient(api, {
  baseUrl: "https://example.com/v1",
  fetch: async (url) => {
    assert.equal(new URL(String(url)).pathname, "/v1/users/user_1");
    return new Response('{"id":"user_1"}', { headers: { "content-type": "application/json" } });
  },
});
assert.equal((await client.getUser({ params: { id: "user_1" } })).success, true);
assert.equal(toOpenApi(api, { title: "Users", version: "1" }).openapi, "3.1.0");
const baseline = createApiSnapshot(api);
assert.equal(compareApiSnapshots(baseline, baseline).decision, "compatible");
