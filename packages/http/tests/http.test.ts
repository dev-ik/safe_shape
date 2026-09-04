import assert from "node:assert/strict";
import test from "node:test";
import {
  ValidationError,
  formatIssuePath,
  literal,
  number,
  object,
  string,
  union,
  type Infer,
} from "@safe-shape/core";
import {
  httpContract,
  parseHttpRequest,
  parseHttpResponse,
  recoverHttpResponse,
  recoverHttpResponseAsync,
  safeParseHttpRequest,
  safeParseHttpResponse,
  safeParseHttpRequestAsync,
  safeParseHttpResponseAsync,
  type HttpRequestData,
  type HttpResponseRecoveryResult,
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

test("http boundaries preserve addressable custom issue paths and order", () => {
  const contract = httpContract({
    body: object({ start: number(), end: number() }).refineWithIssues((value, context) => {
      if (value.start > value.end) {
        context.addIssue({ path: ["start"], message: "Start must not exceed end." });
        context.addIssue({ path: ["end"], message: "End must not precede start." });
      }
    }, { id: "ordered-period/v1" }),
  });

  const result = contract.safeParseRequest({ body: { start: 5, end: 2 } });

  assert.equal(result.success, false);
  assert.deepEqual(result.error.issues.map((issue) => [issue.code, issue.path]), [
    ["custom", ["body", "start"]],
    ["custom", ["body", "end"]],
  ]);
  assert.equal(Object.isFrozen(result.error.issues[0]?.path), true);
});

test("http request failures prefix recursive union branch paths", () => {
  const contract = httpContract({
    body: object({
      role: union([literal("admin"), literal("member")]),
    }),
  });
  const result = contract.safeParseRequest({ body: { role: "owner" } });

  assert.equal(result.success, false);
  const issue = result.error.issues[0]!;
  assert.deepEqual(issue.path, ["body", "role"]);
  assert.deepEqual(issue.branches?.map((branch) => branch.issues[0]?.path), [
    ["body", "role"],
    ["body", "role"],
  ]);
  assert.equal(Object.isFrozen(issue.branches), true);
  assert.equal(Object.isFrozen(issue.branches?.[0]?.issues), true);
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
    severity: "error",
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

test("response recovery returns valid data without evaluating lazy fallback", () => {
  const contract = httpContract({
    response: object({ id: string() }),
  });
  let fallbackCalls = 0;

  const result = recoverHttpResponse(contract, { id: "user_1" }, {
    getFallback: () => {
      fallbackCalls += 1;
      return { id: "cached" };
    },
  });

  assert.deepEqual(result, { kind: "valid", data: { id: "user_1" } });
  assert.equal(fallbackCalls, 0);
  assert.equal(Object.isFrozen(result), true);
});

test("response recovery validates eager and lazy fallbacks through the same status schema", () => {
  const contract = httpContract({
    responses: {
      200: object({ id: string() }),
      404: object({ message: string() }),
    },
  });

  const eager = recoverHttpResponse(contract, { id: 42 }, {
    status: 200,
    fallback: { id: "cached" },
  });
  assert.equal(eager.kind, "recovered");
  if (eager.kind === "recovered") {
    assert.deepEqual(eager.data, { id: "cached" });
    assert.equal(eager.networkError.issues[0]?.code, "invalid_type");
  }

  const lazy = recoverHttpResponse(contract, { message: 42 }, {
    status: 404,
    getFallback: () => ({ message: "Cached missing response" }),
  });
  assert.equal(lazy.kind, "recovered");
  if (lazy.kind === "recovered") {
    assert.deepEqual(lazy.data, { message: "Cached missing response" });
  }
  assert.equal(Object.isFrozen(eager), true);
  assert.equal(Object.isFrozen(lazy), true);
});

test("response recovery exposes both immutable errors when fallback validation fails", () => {
  const contract = httpContract({
    response: object({ id: string() }),
  });

  const result = recoverHttpResponse(contract, { id: 42 }, {
    fallback: { id: false },
  });

  assert.equal(result.kind, "unavailable");
  if (result.kind === "unavailable") {
    assert.equal(result.networkError.issues[0]?.received, "number");
    assert.equal(result.fallbackError.issues[0]?.received, "boolean");
    assert.equal(Object.isFrozen(result.networkError.issues), true);
    assert.equal(Object.isFrozen(result.fallbackError.issues), true);
  }
  assert.equal(Object.isFrozen(result), true);
});

test("response recovery rejects ambiguous options and propagates fallback callback failures", () => {
  const contract = httpContract({ response: object({ id: string() }) });

  assert.throws(
    () => recoverHttpResponse(contract, { id: 42 }, {} as never),
    /exactly one of fallback or getFallback/,
  );
  assert.throws(
    () => recoverHttpResponse(contract, { id: 42 }, {
      fallback: { id: "cached" },
      getFallback: () => ({ id: "other" }),
    } as never),
    /exactly one of fallback or getFallback/,
  );
  assert.throws(
    () => recoverHttpResponse(contract, { id: 42 }, {
      getFallback: "invalid",
    } as never),
    /must be a function/,
  );
  assert.throws(
    () => recoverHttpResponse(contract, { id: 42 }, {
      getFallback: () => {
        throw new Error("cache failed");
      },
    }),
    /cache failed/,
  );
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
  type Recovery = HttpResponseRecoveryResult<InferHttpResponse<typeof contract>>;
  type RecoveryExpectation = Expect<Equal<Recovery,
    | {
        readonly kind: "valid";
        readonly data: Infer<typeof responseSchema>;
        readonly warnings?: readonly import("@safe-shape/core").Warning[];
      }
    | {
        readonly kind: "recovered";
        readonly data: Infer<typeof responseSchema>;
        readonly networkError: ValidationError;
        readonly warnings?: readonly import("@safe-shape/core").Warning[];
      }
    | {
        readonly kind: "unavailable";
        readonly networkError: ValidationError;
        readonly fallbackError: ValidationError;
      }
  >>;

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
  const recoveryExpectation: RecoveryExpectation = true;
  assert.equal(recoveryExpectation, true);
});

test("http contracts propagate warning paths and async rules", async () => {
  const contract = httpContract({
    query: object({
      search: string().warnAsync(async (value) => value.length >= 3, {
        id: "search.short/v1",
        message: "Short searches may be ambiguous.",
      }),
    }),
    response: object({
      id: string().refineAsync(async (value) => value.startsWith("item_"), {
        id: "item.id/v1",
        message: "Invalid item id.",
      }),
    }),
  });

  assert.throws(
    () => contract.safeParseRequest({ query: { search: "x" } }),
    /safeParseAsync/,
  );
  const request = await safeParseHttpRequestAsync(contract, { query: { search: "x" } });
  assert.equal(request.success, true);
  assert.deepEqual(request.warnings?.[0]?.path, ["query", "search"]);

  const response = await safeParseHttpResponseAsync(contract, { id: "bad" });
  assert.equal(response.success, false);
  const recovery = await recoverHttpResponseAsync(contract, { id: "bad" }, {
    fallback: { id: "item_cached" },
  });
  assert.equal(recovery.kind, "recovered");
  assert.deepEqual(recovery.data, { id: "item_cached" });
});
