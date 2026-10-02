import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { array, boolean, integer, intersection, lazy, literal, number, object, string, unknown, type Infer, type Schema } from "@safe-shape/core";
import { apiContract, compareApiSnapshots, createApiClient, createApiSnapshot, httpEndpoint, OpenApiExportError, parseApiSnapshot, safeToOpenApi, toOpenApi, type InferEndpointRequest, type InferEndpointResponse } from "../src/index.js";

const User = object({ id: string(), name: string().optional() });
const getUser = httpEndpoint({ method: "get", path: "/users/{id}", request: { params: object({ id: string() }), query: object({ tags: array(string(), { minLength: 1 }).optional(), active: boolean().optional() }) }, responses: { 200: User, 404: object({ message: string() }) } });
const api = apiContract({ getUser });
function json(value: unknown, status = 200): Response { return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } }); }
function fakeFetch(fn: (url: URL, init: RequestInit) => Promise<Response> | Response): typeof fetch {
  return async (url, init) => fn(new URL(String(url)), init!);
}
function catalog(request: Schema<any, any>, response: Schema<any, any>) {
  return apiContract({ operation: httpEndpoint({ method: "post", path: "/op", request: { body: request }, responses: { 200: response } }) });
}

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
type ResponseInference = Expect<Equal<InferEndpointResponse<typeof getUser>,
  Readonly<{ status: 200; data: Infer<typeof User> }> |
  Readonly<{ status: 404; data: { message: string } }>>>;
const inferredRequest: InferEndpointRequest<typeof getUser> = { params: { id: "1" }, query: {} };
// @ts-expect-error Path parameter must remain a string.
const badRequest: InferEndpointRequest<typeof getUser> = { params: { id: 1 }, query: {} };
void (null as unknown as ResponseInference); void badRequest;

test("catalogs copy and freeze config and reject ambiguous routes", () => {
  const responses: Record<number, Schema<any, any>> = { 200: User };
  const endpoint = httpEndpoint({ method: "get", path: "/users", responses });
  responses[200] = object({ id: string(), name: string() });
  assert.equal(endpoint.config.responses[200], User);
  assert.ok(Object.isFrozen(endpoint.config.responses));
  assert.ok(Object.isFrozen(api.endpoints));
  assert.throws(() => apiContract({ a: getUser, b: httpEndpoint({ ...getUser.config, path: "/users/{other}", request: { params: object({ other: string() }) } }) }), /Duplicate/);
  const prototype = apiContract({ ["__proto__"]: endpoint });
  assert.ok(Object.hasOwn(prototype.endpoints, "__proto__"));
  assert.equal(Object.getPrototypeOf(prototype.endpoints), null);
});

test("invalid endpoint transport declarations fail before callbacks execute", () => {
  let calls = 0;
  const transformed = string().transform((value) => { calls++; return value; });
  const cases = [
    { method: "get", path: "//other", responses: { 200: User } },
    { method: "get", path: "/a/../b", responses: { 200: User } },
    { method: "get", path: "/{id}", responses: { 200: User } },
    { method: "get", path: "/{id}", request: { params: object({ id: string().optional() }) }, responses: { 200: User } },
    { method: "get", path: "/", request: { body: string() }, responses: { 200: User } },
    { method: "get", path: "/", request: { query: object({ data: object({ nested: string() }) }) }, responses: { 200: User } },
    { method: "get", path: "/", request: { headers: object({ Authorization: string() }) }, responses: { 200: User } },
    { method: "get", path: "/", responses: {} },
    { method: "get", path: "/", responses: { 204: User } },
    { method: "head", path: "/", responses: { 200: User } },
    { method: "get", path: "/", responses: { 200: object({ x: transformed }) } },
    { method: "get", path: "/", responses: { 200: object({ x: string() }, { unknownProperties: "strip" }) } },
  ];
  for (const config of cases) assert.throws(() => httpEndpoint(config as Parameters<typeof httpEndpoint>[0]), TypeError);
  assert.equal(calls, 0);
});

test("typed client serializes path/query and preserves declared error responses", async () => {
  const client = createApiClient(api, { baseUrl: "https://example.com/v1/", fetch: fakeFetch((url, init) => {
    assert.equal(url.pathname, "/v1/users/a%2Fb");
    assert.deepEqual(url.searchParams.getAll("tags"), ["x y", "z"]);
    assert.equal(url.searchParams.get("active"), "false");
    assert.equal(init.method, "GET");
    assert.equal(init.redirect, "error");
    return json({ message: "Missing" }, 404);
  }) });
  const result = await client.getUser({ params: { id: "a/b" }, query: { tags: ["x y", "z"], active: false } });
  assert.equal(result.success, true);
  if (result.success && result.status === 404) {
    const message: string = result.data.message;
    assert.equal(message, "Missing");
    // @ts-expect-error Response narrowing must not expose the 200 branch.
    void result.data.id;
  }
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(client));
});

test("request failures stop before fetch; response failures retain native issues", async () => {
  let calls = 0;
  const client = createApiClient(api, { baseUrl: "https://example.com", fetch: fakeFetch(() => { calls++; return json({ id: 42 }); }) });
  const request = await client.getUser({ params: { id: 42 }, query: {} } as never);
  assert.ok(!request.success && request.kind === "request-validation");
  if (!request.success && request.kind === "request-validation") assert.deepEqual(request.error.issues[0]?.path, ["params", "id"]);
  assert.equal(calls, 0);
  const response = await client.getUser(inferredRequest);
  assert.ok(!response.success && response.kind === "response-validation");
  if (!response.success && response.kind === "response-validation") assert.deepEqual(response.error.issues[0]?.path, ["id"]);
  assert.equal(calls, 1);
});

test("client retains async request and response warnings", async () => {
  const warned = string().warnAsync(async () => false, { id: "deprecated/v1" });
  const contracts = catalog(warned, warned);
  const client = createApiClient(contracts, { baseUrl: "https://example.com", fetch: fakeFetch((_url, init) => { assert.equal(init.body, '"old"'); return json("old"); }) });
  const result = await client.operation({ body: "old" });
  assert.ok(result.success);
  assert.equal(result.requestWarnings.length, 1);
  if (result.success) assert.equal(result.responseWarnings.length, 1);
});

test("client reports network, decoding, undeclared status and no-body outcomes", async () => {
  for (const [response, kind] of [
    [new Response("bad", { headers: { "content-type": "application/json" } }), "decoding"],
    [new Response('{"id":"1"}'), "decoding"],
    [json({ id: "1" }, 500), "unexpected-status"],
  ] as const) {
    const client = createApiClient(api, { baseUrl: "https://example.com", fetch: fakeFetch(() => response) });
    const result = await client.getUser(inferredRequest);
    assert.ok(!result.success && result.kind === kind);
  }
  const failed = createApiClient(api, { baseUrl: "https://example.com", fetch: fakeFetch(() => { throw new Error("secret"); }) });
  const failure = await failed.getUser(inferredRequest);
  assert.ok(!failure.success && failure.kind === "network");
  assert.ok(!JSON.stringify(failure).includes("secret"));
  const noBody = apiContract({ remove: httpEndpoint({ method: "delete", path: "/users", responses: { 204: null, 200: null } }) });
  const client = createApiClient(noBody, { baseUrl: "https://example.com", fetch: fakeFetch(() => new Response(null, { status: 204 })) });
  assert.deepEqual(await client.remove({}), { success: true, status: 204, data: undefined, requestWarnings: [], responseWarnings: [] });
  const invalid = createApiClient(noBody, { baseUrl: "https://example.com", fetch: fakeFetch(() => json(null)) });
  assert.ok(!(await invalid.remove({})).success);
});

test("lossy JSON and unsafe path/header serialization never reach transport", async () => {
  const client = createApiClient(catalog(unknown(), unknown()), { baseUrl: "https://example.com", fetch: fakeFetch(() => { assert.fail("Must not fetch"); }) });
  const circular: Record<string, unknown> = {}; circular["self"] = circular;
  const decorated = ["x"]; Object.defineProperty(decorated, "toJSON", { value: () => assert.fail("Must not execute toJSON") });
  for (const body of [NaN, Infinity, -0, 1n, new Date(), { x: undefined }, circular, [, "a"], decorated]) {
    const result = await client.operation({ body });
    assert.ok(!result.success && result.kind === "serialization");
  }
  const pathClient = createApiClient(api, { baseUrl: "https://example.com", fetch: fakeFetch(() => assert.fail("Must not fetch")) });
  for (const id of [".", "..", ""]) assert.ok(!(await pathClient.getUser({ params: { id }, query: {} })).success);
  const queryApi = apiContract({ search: httpEndpoint({ method: "get", path: "/", request: { query: object({ offset: number() }) }, responses: { 200: User } }) });
  const queryClient = createApiClient(queryApi, { baseUrl: "https://example.com", fetch: fakeFetch(() => assert.fail("Must not fetch")) });
  const queryResult = await queryClient.search({ query: { offset: -0 } });
  assert.ok(!queryResult.success && queryResult.kind === "serialization");
  assert.throws(() => createApiClient(api, { baseUrl: "https://user:password@example.com" }), TypeError);
});

test("real fetch round trip validates JSON and forwards cancellation", async () => {
  const server = createServer((request, response) => {
    assert.equal(request.url, "/v1/users/1");
    response.setHeader("content-type", "application/json"); response.end('{"id":"1"}');
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  try {
    const address = server.address(); assert.ok(address && typeof address === "object");
    const client = createApiClient(api, { baseUrl: `http://127.0.0.1:${address.port}/v1` });
    assert.ok((await client.getUser(inferredRequest)).success);
    const controller = new AbortController(); controller.abort();
    const result = await client.getUser(inferredRequest, { signal: controller.signal });
    assert.ok(!result.success && result.kind === "network");
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("OpenAPI export uses wire schemas and explicit serialization", () => {
  const document = toOpenApi(api, { title: "Users", version: "1" }) as any;
  assert.equal(document.openapi, "3.1.0");
  assert.equal(document.paths["/users/{id}"].get.operationId, "getUser");
  assert.deepEqual(document.paths["/users/{id}"].get.parameters.map((p: any) => [p.name, p.in, p.required, p.style, p.explode]), [
    ["id", "path", true, "simple", false], ["active", "query", false, "form", true], ["tags", "query", false, "form", true],
  ]);
  assert.ok(Object.isFrozen(document.components.schemas));
  const optionalBody = toOpenApi(catalog(string().optional(), string()), { title: "Optional", version: "1" }) as any;
  assert.equal(optionalBody.paths["/op"].post.requestBody.required, false);
});

test("recursive OpenAPI references resolve within isolated components", () => {
  interface Tree { readonly children: readonly Tree[] }
  let tree: Schema<Tree>;
  tree = lazy(() => object({ children: array(tree) }), { id: "Tree/~ # %雪" });
  const document = toOpenApi(catalog(tree, tree), { title: "Tree", version: "1" });
  const raw = document as any;
  const refs: string[] = [];
  function walk(value: any): void {
    if (!value || typeof value !== "object") return;
    if (typeof value.$ref === "string") refs.push(value.$ref);
    Object.values(value).forEach(walk);
  }
  walk(raw);
  assert.ok(refs.length >= 4);
  for (const ref of refs) {
    let target: any = raw;
    for (const segment of decodeURIComponent(ref.slice(2)).split("/")) target = target[segment.replace(/~1/g, "/").replace(/~0/g, "~")];
    assert.ok(target, `Unresolved ${ref}`);
  }
});

test("opaque export errors are structured and no partial artifact is returned", () => {
  let calls = 0;
  const schema = User.refine(() => { calls++; return true; }, { id: "custom/v1" });
  const refined = apiContract({ get: httpEndpoint({ method: "get", path: "/", responses: { 200: schema } }) });
  const result = safeToOpenApi(refined, { title: "Users", version: "1" });
  assert.ok(!result.success);
  if (!result.success) {
    assert.ok(!Object.hasOwn(result, "document"));
    assert.equal(result.issues[0]?.cause?.code, "json_schema.refinement.unrepresentable");
    assert.deepEqual(result.issues[0]?.path.slice(0, 3), ["get", "responses", "200"]);
    assert.ok(Object.isFrozen(result.issues[0]?.path));
  }
  assert.throws(() => toOpenApi(refined, { title: "Users", version: "1" }), OpenApiExportError);
  assert.equal(calls, 0);
});

test("OpenAPI refuses non-JSON literals instead of losing constraints during serialization", () => {
  for (const value of [undefined, NaN, Infinity, -Infinity, -0]) {
    const result = safeToOpenApi(catalog(literal(value), string()), { title: "Unsupported", version: "1" });
    assert.ok(!result.success);
    if (!result.success) {
      assert.equal(result.issues[0]?.code, "openapi.schema.unsupported");
      assert.deepEqual(result.issues[0]?.path, ["operation", "request", "body", "const"]);
    }
  }
});

test("snapshots round trip deterministically and reject tampering", () => {
  const baseline = createApiSnapshot(api);
  assert.deepEqual(parseApiSnapshot(JSON.parse(JSON.stringify(baseline))), baseline);
  assert.ok(Object.isFrozen(baseline.endpoints.getUser?.request));
  const changed = JSON.parse(JSON.stringify(baseline)); changed.endpoints.getUser.path = "/other/{id}";
  assert.throws(() => parseApiSnapshot(changed), /fingerprint/);
  const corrupt = JSON.parse(JSON.stringify(baseline)); corrupt.endpoints.getUser.responses[200].input.root.kind = "unknown";
  assert.throws(() => parseApiSnapshot(corrupt));
  const duplicate = JSON.parse(JSON.stringify(baseline)); duplicate.endpoints.other = duplicate.endpoints.getUser;
  assert.throws(() => parseApiSnapshot(duplicate));
});

test("native intersection and recursive wire schemas remain snapshot-loadable", () => {
  const intersected = intersection(User, User);
  const intersectionSnapshot = createApiSnapshot(catalog(intersected, intersected));
  assert.deepEqual(parseApiSnapshot(JSON.parse(JSON.stringify(intersectionSnapshot))), intersectionSnapshot);
  assert.equal(compareApiSnapshots(intersectionSnapshot, intersectionSnapshot).compatible, true);
  interface Tree { readonly children: readonly Tree[] }
  let tree: Schema<Tree>;
  tree = lazy(() => object({ children: array(tree) }), { id: "tree" });
  const recursive = createApiSnapshot(catalog(tree, tree));
  assert.deepEqual(parseApiSnapshot(JSON.parse(JSON.stringify(recursive))), recursive);
  assert.equal(compareApiSnapshots(recursive, recursive).compatible, true);
});

test("API comparison proves requests backward and responses forward", () => {
  const loose = number({ minimum: 0 }); const narrow = number({ minimum: 10 });
  const old = createApiSnapshot(catalog(narrow, loose));
  const safe = compareApiSnapshots(old, createApiSnapshot(catalog(loose, narrow)));
  assert.equal(safe.decision, "compatible");
  assert.ok(safe.findings.every((finding) => finding.comparison?.side === "input"));
  const breaking = compareApiSnapshots(createApiSnapshot(catalog(loose, narrow)), old);
  assert.equal(breaking.decision, "migration-required");
  assert.equal(breaking.findings.filter((finding) => finding.status === "breaking").length, 2);
});

test("API comparison handles routes, response dispatch and opaque rules conservatively", () => {
  const baseline = createApiSnapshot(api);
  assert.equal(compareApiSnapshots(baseline, createApiSnapshot(apiContract({}))).decision, "migration-required");
  const route = apiContract({ getUser: httpEndpoint({ ...getUser.config, path: "/accounts/{id}" }) });
  assert.equal(compareApiSnapshots(baseline, createApiSnapshot(route)).decision, "migration-required");
  const extraStatus = apiContract({ getUser: httpEndpoint({ ...getUser.config, responses: { ...getUser.config.responses, 500: User } }) });
  assert.equal(compareApiSnapshots(baseline, createApiSnapshot(extraStatus)).decision, "migration-required");
  const removedStatus = apiContract({ getUser: httpEndpoint({ ...getUser.config, responses: { 200: User } }) });
  assert.equal(compareApiSnapshots(baseline, createApiSnapshot(removedStatus)).decision, "compatible");
  const opaque = createApiSnapshot(catalog(string().refine(() => true), string()));
  assert.equal(compareApiSnapshots(opaque, opaque).decision, "manual-review");
});

test("adding optional request body is safe but requiring it breaks existing clients", () => {
  const noBody = createApiSnapshot(apiContract({ operation: httpEndpoint({ method: "post", path: "/op", responses: { 200: string() } }) }));
  assert.equal(compareApiSnapshots(noBody, createApiSnapshot(catalog(string().optional(), string()))).decision, "compatible");
  assert.equal(compareApiSnapshots(noBody, createApiSnapshot(catalog(string(), string()))).decision, "migration-required");
});

test("native request/response containment agrees with finite runtime witnesses", () => {
  const schemas = [literal(1), integer({ minimum: 0, maximum: 2 }), number({ minimum: 0, maximum: 3 }), number()];
  for (const first of schemas) for (const second of schemas) {
    const report = compareApiSnapshots(createApiSnapshot(catalog(first, first)), createApiSnapshot(catalog(second, second)));
    if (!report.compatible) continue;
    for (const value of [-1, 0, 1, 1.5, 2, 3, 4]) {
      if (first.safeParse(value).success) assert.ok(second.safeParse(value).success);
      if (second.safeParse(value).success) assert.ok(first.safeParse(value).success);
    }
  }
});
