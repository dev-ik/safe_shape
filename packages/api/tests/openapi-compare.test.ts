import assert from "node:assert/strict";
import test from "node:test";
import { compareOpenApi } from "../src/index.js";

function document(schema: unknown = { type: "string" }): any {
  return { openapi: "3.1.0", info: { title: "Test", version: "1" }, paths: {
    "/users/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
      post: {
        requestBody: { required: true, content: { "application/json": { schema } } },
        responses: { "200": { description: "OK", content: { "application/json": { schema: structuredClone(schema) } } } },
      },
    },
  } };
}
const operation = (doc: any) => doc.paths["/users/{id}"].post;
const request = (doc: any) => operation(doc).requestBody.content["application/json"];
const response = (doc: any) => operation(doc).responses["200"].content["application/json"];

test("compares OpenAPI YAML directly with JSON and parsed documents", () => {
  const yaml = `openapi: 3.0.3
info: {title: Test, version: '1'}
paths:
  /users:
    post:
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              required: [name]
              properties:
                name: {type: string, minLength: 2}
      responses:
        204: {description: Saved}
`;
  const report = compareOpenApi(yaml, yaml.replace("minLength: 2", "minLength: 3"));
  assert.equal(report.decision, "migration-required");
  assert.equal(report.compatible, false);
  assert.ok(report.findings.some((finding) => finding.comparison?.status === "breaking"));
  const doc = document();
  assert.equal(compareOpenApi(JSON.stringify(doc), doc).compatible, true);
});

test("uses backward request and forward response containment including required fields", () => {
  const old = document({ type: "string", minLength: 2 });
  const next = structuredClone(old);
  request(next).schema.minLength = 1;
  response(next).schema.minLength = 3;
  assert.equal(compareOpenApi(old, next).compatible, true);
  assert.equal(compareOpenApi(next, old).decision, "migration-required");
  const first = document({ type: "object", properties: { name: { type: "string" } } });
  const second = structuredClone(first);
  request(second).schema.required = ["name"];
  assert.equal(compareOpenApi(first, second).decision, "migration-required");
  const third = structuredClone(first);
  response(first).schema.required = ["name"];
  assert.equal(compareOpenApi(first, third).decision, "migration-required");
});

test("operation identity is method/path, independent of operationId and key order", () => {
  const old = document();
  const next = structuredClone(old);
  operation(old).operationId = "before";
  operation(next).operationId = "after";
  assert.equal(compareOpenApi(old, next).compatible, true);
  delete next.paths["/users/{id}"].post;
  assert.equal(compareOpenApi(old, next).decision, "migration-required");
  assert.equal(compareOpenApi(next, old).compatible, true);
});

test("resolves recursive local schema refs and escaped pointer tokens", () => {
  const doc = document({ $ref: "#/components/schemas/User~1Node" });
  doc.components = { schemas: { "User/Node": { type: "object", required: ["name"], properties: {
    name: { type: "string", minLength: 2 }, next: { $ref: "#/components/schemas/User~1Node" },
  } } } };
  assert.equal(compareOpenApi(doc, doc).compatible, true);
  const next = structuredClone(doc);
  next.components.schemas["User/Node"].properties.name.minLength = 3;
  assert.equal(compareOpenApi(doc, next).decision, "migration-required");
});

test("parameter overrides, header names and serialization changes are handled", () => {
  const old = document();
  const next = structuredClone(old);
  operation(next).parameters = [{ name: "id", in: "path", required: true, schema: { type: "integer", minimum: 1 } }];
  assert.equal(compareOpenApi(old, next).decision, "migration-required");
  operation(old).parameters = [{ name: "X-Token", in: "header", schema: { type: "string" } }];
  operation(next).parameters = [{ name: "x-token", in: "header", schema: { type: "string" } }];
  assert.equal(compareOpenApi(old, next).compatible, true);
  operation(next).parameters[0].explode = true;
  assert.equal(compareOpenApi(old, next).decision, "manual-review");
});

test("request body presence, media types, response statuses and headers affect compatibility", () => {
  const old = document();
  const next = structuredClone(old);
  operation(old).requestBody.required = false;
  assert.equal(compareOpenApi(old, next).decision, "migration-required");
  operation(next).requestBody.required = false;
  operation(next).responses["201"] = { description: "Created" };
  assert.equal(compareOpenApi(old, next).decision, "migration-required");
  delete operation(next).responses["201"];
  response(next).schema = { type: "number" };
  assert.equal(compareOpenApi(old, next).decision, "migration-required");
  response(next).schema = { type: "string" };
  operation(old).responses["200"].headers = { "X-Id": { required: true, schema: { type: "string" } } };
  assert.equal(compareOpenApi(old, next).decision, "migration-required");
});

test("default and range responses cover matching explicit statuses", () => {
  const old = document();
  const next = structuredClone(old);
  operation(old).responses = { "2XX": operation(old).responses["200"], default: { description: "Error" } };
  operation(next).responses["404"] = { description: "Error" };
  assert.equal(compareOpenApi(old, next).compatible, true);
});

test("OpenAPI 3.0 nullable does not bypass enum and extra object fields are allowed by default", () => {
  const old = document({ type: "string", nullable: true, enum: ["a"] });
  old.openapi = "3.0.3";
  const next = structuredClone(old);
  request(next).schema.enum = ["a", null];
  response(next).schema.enum = ["a", null];
  assert.equal(compareOpenApi(old, next).decision, "migration-required");
  const a = document({ type: "object", properties: { name: { type: "string" } } });
  const b = structuredClone(a);
  request(b).schema.additionalProperties = false;
  assert.equal(compareOpenApi(a, b).decision, "migration-required");
});

test("unsupported assertions and invalid input never produce compatible reports", () => {
  for (const schema of [
    { type: "array", items: { type: "string" }, uniqueItems: true },
    { oneOf: [{ type: "string" }, { type: "string" }] },
    { type: "number", exclusiveMinimum: 0 },
    { type: "string", format: "email" },
    { type: "string", readOnly: true },
    { type: "string", xml: { attribute: true } },
    { $ref: "https://example.com/schema.json" },
    { $ref: "#/components/schemas/Missing" },
  ]) {
    const report = compareOpenApi(document(schema), document(schema));
    assert.equal(report.compatible, false, JSON.stringify(schema));
    assert.equal(report.decision, "manual-review");
    assert.ok(report.issues.length > 0);
  }
  for (const input of ["openapi: [", "openapi: 3.1.0\nopenapi: 3.0.3", {}, null, { ...document(), openapi: "2.0" }]) {
    assert.equal(compareOpenApi(input, document()).compatible, false);
  }
});

test("formats require an explicit interpretation and reports are immutable", () => {
  const doc = document({ type: "string", format: "email" });
  const report = compareOpenApi(doc, doc, { formatPolicy: "annotation" });
  assert.equal(report.compatible, true);
  assert.ok(Object.isFrozen(report));
  assert.ok(Object.isFrozen(report.findings));
  assert.ok(Object.isFrozen(report.issues));
  assert.equal(compareOpenApi(doc, doc, { formatPolicy: "safe-shape" }).compatible, true);
  assert.equal(Object.isFrozen(doc), false);
});

test("security and server changes require manual review", () => {
  const old = document();
  const next = structuredClone(old);
  next.security = [{ bearer: [] }];
  assert.equal(compareOpenApi(old, next).decision, "manual-review");
  delete next.security;
  next.servers = [{ url: "https://other.example" }];
  assert.equal(compareOpenApi(old, next).decision, "manual-review");
});

test("cyclic objects, unproductive refs and dangerous property names are bounded safely", () => {
  const cyclic: any = document();
  cyclic.components = cyclic;
  assert.equal(compareOpenApi(cyclic, document()).compatible, false);
  const refs = document({ $ref: "#/components/schemas/A" });
  refs.components = { schemas: { A: { $ref: "#/components/schemas/A" } } };
  assert.equal(compareOpenApi(refs, refs).compatible, false);
  const proto = document(JSON.parse('{"type":"object","properties":{"__proto__":{"type":"string"}},"required":["__proto__"]}'));
  assert.equal(compareOpenApi(proto, proto).compatible, true);
});

test("invalid null declarations and non-JSON values cannot silently widen schemas", () => {
  for (const schema of [
    null, { type: "object", required: null }, { type: "object", additionalProperties: null },
    { type: "array", items: null }, { type: "number", minimum: Infinity },
  ]) {
    const doc = document(schema);
    assert.equal(compareOpenApi(doc, doc).compatible, false, JSON.stringify(schema));
  }
  const doc = document();
  Object.defineProperty(doc, "components", { enumerable: true, get() { throw new Error("must not run"); } });
  assert.equal(compareOpenApi(doc, document()).compatible, false);
});

test("arrays, nullable type arrays, scalar enums and compositions retain constraints", () => {
  const cases = [
    [{ type: "array", items: { type: "integer" }, minItems: 1 }, { type: "array", items: { type: "integer" }, minItems: 2 }],
    [{ type: ["string", "null"] }, { type: "string" }],
    [{ type: "integer", enum: [1, 2, 3] }, { type: "integer", enum: [1, 2] }],
    [{ anyOf: [{ type: "string" }, { type: "boolean" }] }, { type: "string" }],
    [{ type: "object", required: ["a"], properties: { a: { type: "string" } } },
      { allOf: [{ type: "object", required: ["a"], properties: { a: { type: "string" } } }, { type: "object", required: ["b"], properties: { b: { type: "number" } } }] }],
  ];
  for (const [first, second] of cases) {
    const old = document(first), next = document(first);
    request(next).schema = second;
    const report = compareOpenApi(old, next);
    assert.deepEqual(report.issues, []);
    assert.equal(report.compatible, false, JSON.stringify(second));
  }
});

test("reference objects can supply path items, parameters, request bodies and responses", () => {
  const doc = document();
  const item = doc.paths["/users/{id}"];
  doc.components = {
    pathItems: { User: item }, parameters: { Id: item.parameters[0] },
    requestBodies: { Body: operation(doc).requestBody }, responses: { Ok: operation(doc).responses["200"] },
  };
  item.parameters = [{ $ref: "#/components/parameters/Id" }];
  item.post.requestBody = { $ref: "#/components/requestBodies/Body" };
  item.post.responses["200"] = { $ref: "#/components/responses/Ok" };
  doc.paths["/users/{id}"] = { $ref: "#/components/pathItems/User" };
  assert.equal(compareOpenApi(doc, doc).compatible, true);
});

test("body media changes and unsupported HTTP features do not disappear", () => {
  const old = document(), next = document();
  operation(next).requestBody.content = { "application/problem+json": { schema: { type: "string" } } };
  assert.equal(compareOpenApi(old, next).decision, "migration-required");
  for (const field of ["callbacks", "unexpectedKeyword"]) {
    const doc = document();
    operation(doc)[field] = {};
    assert.equal(compareOpenApi(doc, doc).decision, "manual-review");
  }
  const invalid = compareOpenApi("openapi: [", document());
  assert.equal(invalid.issues[0]?.source, "previous");
  assert.ok(Object.isFrozen(invalid.issues[0]));
  assert.ok(Object.isFrozen(invalid.issues[0]?.path));
  assert.deepEqual(invalid.findings, []);
});

test("YAML duplicate keys, custom tags, cyclic aliases and multiple documents are rejected", () => {
  for (const source of [
    "openapi: 3.1.0\nopenapi: 3.0.3", "openapi: !custom 3.1.0",
    "a: &a {self: *a}", "openapi: 3.1.0\n---\nopenapi: 3.1.0",
    "%YAML 1.1\n---\nopenapi: 3.1.0",
  ]) assert.equal(compareOpenApi(source, document()).decision, "manual-review");
});

test("non-JSON media and invalid transport declarations require review", () => {
  const xml = document();
  operation(xml).responses["200"].content = { "application/xml": { schema: { type: "string" } } };
  assert.equal(compareOpenApi(xml, xml).decision, "manual-review");
  for (const field of ["security", "servers"]) {
    const doc = document();
    operation(doc)[field] = null;
    assert.equal(compareOpenApi(doc, doc).decision, "manual-review");
  }
});

test("adding optional request parameters or response headers preserves existing clients", () => {
  const old = document(), next = document();
  operation(next).parameters = [{ name: "search", in: "query", schema: { type: "string" } }];
  operation(next).responses["200"].headers = { "X-Trace": { schema: { type: "string" } } };
  assert.equal(compareOpenApi(old, next).decision, "compatible");
  operation(next).parameters[0].required = true;
  assert.equal(compareOpenApi(old, next).decision, "migration-required");
  delete operation(next).responses["200"].headers;
  assert.equal(compareOpenApi(next, old).decision, "manual-review");
});
