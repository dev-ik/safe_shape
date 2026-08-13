import assert from "node:assert/strict";
import test from "node:test";
import { ValidationError, formatIssuePath, number, object, string, type Infer } from "@safe-shape/core";
import {
  httpContract,
  parseHttpRequest,
  parseHttpResponse,
  safeParseHttpRequest,
  safeParseHttpResponse,
  type HttpRequestData,
  type InferHttpRequest,
  type InferHttpResponse,
} from "../src/index.js";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2) ? true : false;

type Expect<Value extends true> = Value;

test("http contracts parse request sections independently", () => {
  const contract = httpContract({
    params: object({ id: string() }),
    query: object({ page: number() }),
    body: object({ name: string() }),
    headers: object({ authorization: string() }),
    cookies: object({ session: string() }),
  });

  const result = contract.safeParseRequest({
    params: { id: "user_1" },
    query: { page: 2 },
    body: { name: "Dev" },
    headers: { authorization: "Bearer token" },
    cookies: { session: "session_1" },
  });

  assert.deepEqual(result, {
    success: true,
    data: {
      params: { id: "user_1" },
      query: { page: 2 },
      body: { name: "Dev" },
      headers: { authorization: "Bearer token" },
      cookies: { session: "session_1" },
    },
  });
});

test("http request failures prefix issue paths with section names", () => {
  const contract = httpContract({
    params: object({ id: string() }),
    body: object({ name: string() }),
    headers: object({ authorization: string() }),
    cookies: object({ session: string() }),
  });

  const result = contract.safeParseRequest({
    params: { id: 123 },
    body: { name: 456 },
    headers: { authorization: 789 },
    cookies: { session: 101112 },
  });

  assert.equal(result.success, false);
  assert.deepEqual(
    result.error.issues.map((issue) => [issue.code, issue.path, formatIssuePath(issue.path)]),
    [
      ["invalid_type", ["params", "id"], "input.params.id"],
      ["invalid_type", ["body", "name"], "input.body.name"],
      ["invalid_type", ["headers", "authorization"], "input.headers.authorization"],
      ["invalid_type", ["cookies", "session"], "input.cookies.session"],
    ],
  );
});

test("http contracts parse and validate responses", () => {
  const contract = httpContract({
    response: object({ id: string() }),
  });

  assert.deepEqual(contract.safeParseResponse({ id: "user_1" }), {
    success: true,
    data: { id: "user_1" },
  });

  const result = contract.safeParseResponse({ id: 123 });
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0]?.path, ["id"]);
});

test("http contracts parse responses by status code", () => {
  const contract = httpContract({
    responses: {
      200: object({ id: string() }),
      404: object({ message: string() }),
    },
  });

  assert.deepEqual(contract.safeParseResponse({ id: "user_1" }, 200), {
    success: true,
    data: { id: "user_1" },
  });
  assert.deepEqual(contract.safeParseResponse({ message: "Missing" }, 404), {
    success: true,
    data: { message: "Missing" },
  });

  const result = contract.safeParseResponse({ id: 123 }, 200);
  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0]?.path, ["id"]);
});

test("http response status mapping reports unknown statuses without fallback response", () => {
  const contract = httpContract({
    responses: {
      200: object({ id: string() }),
      404: object({ message: string() }),
    },
  });

  const result = contract.safeParseResponse({ id: "user_1" }, 500);

  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues[0], {
    code: "custom",
    path: ["response", "status"],
    expected: "200 | 404",
    received: "500",
    message: "Unexpected response status 500.",
    suggestion: "Pass a status with a configured response schema or add a fallback response schema.",
  });
});

test("http response status mapping falls back to response schema", () => {
  const contract = httpContract({
    response: object({ fallback: string() }),
    responses: {
      200: object({ id: string() }),
    },
  });

  assert.deepEqual(contract.safeParseResponse({ id: "user_1" }, 200), {
    success: true,
    data: { id: "user_1" },
  });
  assert.deepEqual(contract.safeParseResponse({ fallback: "ok" }, 500), {
    success: true,
    data: { fallback: "ok" },
  });
});

test("parseRequest and parseResponse throw ValidationError on failure", () => {
  const contract = httpContract({
    body: object({ name: string() }),
    response: object({ id: string() }),
  });

  assert.throws(() => contract.parseRequest({ body: { name: 123 } }), ValidationError);
  assert.throws(() => contract.parseResponse({ id: 123 }), ValidationError);
});

test("standalone helpers parse requests and responses through a contract", () => {
  const contract = httpContract({
    params: object({ id: string() }),
    response: object({ id: string() }),
  });

  assert.deepEqual(
    safeParseHttpRequest(contract, { params: { id: "user_1" } }),
    {
      success: true,
      data: {
        params: { id: "user_1" },
      },
    },
  );
  assert.deepEqual(parseHttpRequest(contract, { params: { id: "user_1" } }), {
    params: { id: "user_1" },
  });
  assert.deepEqual(safeParseHttpResponse(contract, { id: "user_1" }), {
    success: true,
    data: { id: "user_1" },
  });
  assert.deepEqual(parseHttpResponse(contract, { id: "user_1" }), { id: "user_1" });
});

test("standalone helpers throw ValidationError on failure", () => {
  const contract = httpContract({
    params: object({ id: string() }),
    response: object({ id: string() }),
  });

  assert.throws(() => parseHttpRequest(contract, { params: { id: 123 } }), ValidationError);
  assert.throws(() => parseHttpResponse(contract, { id: 123 }), ValidationError);
});

test("standalone response helpers accept status codes", () => {
  const contract = httpContract({
    responses: {
      201: object({ id: string() }),
    },
  });

  assert.deepEqual(safeParseHttpResponse(contract, { id: "user_1" }, 201), {
    success: true,
    data: { id: "user_1" },
  });
  assert.deepEqual(parseHttpResponse(contract, { id: "user_1" }, 201), {
    id: "user_1",
  });
});

test("http contract output types are inferred from configured sections", () => {
  const paramsSchema = object({ id: string() });
  const bodySchema = object({ name: string() });
  const headersSchema = object({ authorization: string() });
  const cookiesSchema = object({ session: string() });
  const responseSchema = object({ ok: string() });
  const contract = httpContract({
    params: paramsSchema,
    body: bodySchema,
    headers: headersSchema,
    cookies: cookiesSchema,
    response: responseSchema,
  });

  type Request = HttpRequestData<typeof paramsSchema, undefined, typeof bodySchema>;
  type RequestExpectation = Expect<
    Equal<
      Request,
      {
        readonly params: Infer<typeof paramsSchema>;
        readonly body: Infer<typeof bodySchema>;
      }
    >
  >;

  const request: Request = {
    params: { id: "user_1" },
    body: { name: "Dev" },
  };

  type HelperRequest = InferHttpRequest<typeof contract>;
  type HelperRequestExpectation = Expect<
    Equal<
      HelperRequest,
      {
        readonly params: Infer<typeof paramsSchema>;
        readonly body: Infer<typeof bodySchema>;
        readonly headers: Infer<typeof headersSchema>;
        readonly cookies: Infer<typeof cookiesSchema>;
      }
    >
  >;

  type HelperResponse = InferHttpResponse<typeof contract>;
  type HelperResponseExpectation = Expect<Equal<HelperResponse, Infer<typeof responseSchema>>>;

  const okResponseSchema = object({ id: string() });
  const notFoundResponseSchema = object({ message: string() });
  const responseMapContract = httpContract({
    responses: {
      200: okResponseSchema,
      404: notFoundResponseSchema,
    },
  });

  type MappedResponse = InferHttpResponse<typeof responseMapContract>;
  type MappedResponseExpectation = Expect<
    Equal<MappedResponse, Infer<typeof okResponseSchema> | Infer<typeof notFoundResponseSchema>>
  >;

  assert.equal(request.params.id, "user_1");
});
