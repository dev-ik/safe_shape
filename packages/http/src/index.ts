import {
  ValidationError,
  failure,
  success,
  type Infer,
  type Issue,
  type ParseResult,
  type Schema,
} from "@safe-shape/core";

type MaybeSchema = Schema<any> | undefined;
type MaybeResponseMap = Readonly<Record<number, Schema<any>>> | undefined;

type Expand<T> = {
  [Key in keyof T]: T[Key];
} & {};

type SectionOutput<TKey extends string, TSchema extends MaybeSchema> =
  TSchema extends Schema<any> ? { readonly [Key in TKey]: Infer<TSchema> } : {};

export type HttpRequestData<
  TParams extends MaybeSchema,
  TQuery extends MaybeSchema,
  TBody extends MaybeSchema,
  THeaders extends MaybeSchema = undefined,
  TCookies extends MaybeSchema = undefined,
> = Expand<
  SectionOutput<"params", TParams> &
    SectionOutput<"query", TQuery> &
    SectionOutput<"body", TBody> &
    SectionOutput<"headers", THeaders> &
    SectionOutput<"cookies", TCookies>
>;

export type HttpResponseData<TResponse extends MaybeSchema> =
  TResponse extends Schema<any> ? Infer<TResponse> : unknown;

export type HttpMappedResponseData<TResponses extends MaybeResponseMap> =
  TResponses extends Readonly<Record<number, Schema<any>>>
    ? Infer<TResponses[Extract<keyof TResponses, number>]>
    : never;

export type HttpAnyResponseData<
  TResponse extends MaybeSchema,
  TResponses extends MaybeResponseMap,
> = TResponses extends Readonly<Record<number, Schema<any>>>
  ? HttpMappedResponseData<TResponses>
  : HttpResponseData<TResponse>;

export interface HttpRequestInput {
  readonly params?: unknown;
  readonly query?: unknown;
  readonly body?: unknown;
  readonly headers?: unknown;
  readonly cookies?: unknown;
}

export interface HttpContractConfig<
  TParams extends MaybeSchema = undefined,
  TQuery extends MaybeSchema = undefined,
  TBody extends MaybeSchema = undefined,
  TResponse extends MaybeSchema = undefined,
  THeaders extends MaybeSchema = undefined,
  TCookies extends MaybeSchema = undefined,
  TResponses extends MaybeResponseMap = undefined,
> {
  readonly params?: TParams;
  readonly query?: TQuery;
  readonly body?: TBody;
  readonly response?: TResponse;
  readonly responses?: TResponses;
  readonly headers?: THeaders;
  readonly cookies?: TCookies;
}

export interface HttpContract<
  TParams extends MaybeSchema,
  TQuery extends MaybeSchema,
  TBody extends MaybeSchema,
  TResponse extends MaybeSchema,
  THeaders extends MaybeSchema = undefined,
  TCookies extends MaybeSchema = undefined,
  TResponses extends MaybeResponseMap = undefined,
> {
  safeParseRequest(
    input: HttpRequestInput,
  ): ParseResult<HttpRequestData<TParams, TQuery, TBody, THeaders, TCookies>>;
  parseRequest(input: HttpRequestInput): HttpRequestData<TParams, TQuery, TBody, THeaders, TCookies>;
  safeParseResponse(input: unknown, status?: number): ParseResult<HttpAnyResponseData<TResponse, TResponses>>;
  parseResponse(input: unknown, status?: number): HttpAnyResponseData<TResponse, TResponses>;
}

export type InferHttpRequest<TContract extends HttpContract<any, any, any, any, any, any, any>> =
  TContract extends HttpContract<
    infer TParams,
    infer TQuery,
    infer TBody,
    any,
    infer THeaders,
    infer TCookies,
    any
  >
    ? HttpRequestData<TParams, TQuery, TBody, THeaders, TCookies>
    : never;

export type InferHttpResponse<TContract extends HttpContract<any, any, any, any, any, any, any>> =
  TContract extends HttpContract<any, any, any, infer TResponse, any, any, infer TResponses>
    ? HttpAnyResponseData<TResponse, TResponses>
    : never;

type RequestSection = "params" | "query" | "body" | "headers" | "cookies";

export function httpContract<
  const TParams extends MaybeSchema = undefined,
  const TQuery extends MaybeSchema = undefined,
  const TBody extends MaybeSchema = undefined,
  const TResponse extends MaybeSchema = undefined,
  const THeaders extends MaybeSchema = undefined,
  const TCookies extends MaybeSchema = undefined,
  const TResponses extends MaybeResponseMap = undefined,
>(
  config: HttpContractConfig<TParams, TQuery, TBody, TResponse, THeaders, TCookies, TResponses>,
): HttpContract<TParams, TQuery, TBody, TResponse, THeaders, TCookies, TResponses> {
  const frozenConfig = freezeHttpContractConfig(config);

  return Object.freeze({
    safeParseRequest(input: HttpRequestInput) {
      return safeParseRequest(frozenConfig, input);
    },
    parseRequest(input: HttpRequestInput) {
      const result = safeParseRequest(frozenConfig, input);

      if (!result.success) {
        throw result.error;
      }

      return result.data;
    },
    safeParseResponse(input: unknown, status?: number) {
      return safeParseResponse(frozenConfig.response, frozenConfig.responses, input, status);
    },
    parseResponse(input: unknown, status?: number) {
      const result = safeParseResponse(frozenConfig.response, frozenConfig.responses, input, status);

      if (!result.success) {
        throw result.error;
      }

      return result.data;
    },
  }) as HttpContract<TParams, TQuery, TBody, TResponse, THeaders, TCookies, TResponses>;
}

export function safeParseHttpRequest<TContract extends HttpContract<any, any, any, any, any, any, any>>(
  contract: TContract,
  input: HttpRequestInput,
): ParseResult<InferHttpRequest<TContract>> {
  return contract.safeParseRequest(input) as ParseResult<InferHttpRequest<TContract>>;
}

export function parseHttpRequest<TContract extends HttpContract<any, any, any, any, any, any, any>>(
  contract: TContract,
  input: HttpRequestInput,
): InferHttpRequest<TContract> {
  const result = safeParseHttpRequest(contract, input);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

export function safeParseHttpResponse<TContract extends HttpContract<any, any, any, any, any, any, any>>(
  contract: TContract,
  input: unknown,
  status?: number,
): ParseResult<InferHttpResponse<TContract>> {
  return contract.safeParseResponse(input, status) as ParseResult<InferHttpResponse<TContract>>;
}

export function parseHttpResponse<TContract extends HttpContract<any, any, any, any, any, any, any>>(
  contract: TContract,
  input: unknown,
  status?: number,
): InferHttpResponse<TContract> {
  const result = safeParseHttpResponse(contract, input, status);

  if (!result.success) {
    throw result.error;
  }

  return result.data;
}

function safeParseRequest<
  TParams extends MaybeSchema,
  TQuery extends MaybeSchema,
  TBody extends MaybeSchema,
  TResponse extends MaybeSchema,
  THeaders extends MaybeSchema,
  TCookies extends MaybeSchema,
  TResponses extends MaybeResponseMap,
>(
  config: HttpContractConfig<TParams, TQuery, TBody, TResponse, THeaders, TCookies, TResponses>,
  input: HttpRequestInput,
): ParseResult<HttpRequestData<TParams, TQuery, TBody, THeaders, TCookies>> {
  const output: Record<string, unknown> = {};
  const issues: Issue[] = [];

  parseRequestSection(config.params, "params", input.params, output, issues);
  parseRequestSection(config.query, "query", input.query, output, issues);
  parseRequestSection(config.body, "body", input.body, output, issues);
  parseRequestSection(config.headers, "headers", input.headers, output, issues);
  parseRequestSection(config.cookies, "cookies", input.cookies, output, issues);

  return issues.length === 0
    ? success(Object.freeze(output) as HttpRequestData<TParams, TQuery, TBody, THeaders, TCookies>)
    : failure(issues);
}

function parseRequestSection(
  schema: MaybeSchema,
  section: RequestSection,
  value: unknown,
  output: Record<string, unknown>,
  issues: Issue[],
): void {
  if (schema === undefined) {
    return;
  }

  const result = schema.safeParse(value);

  if (result.success) {
    output[section] = result.data;
    return;
  }

  issues.push(...prefixIssues(section, result.error.issues));
}

function safeParseResponse<TResponse extends MaybeSchema, TResponses extends MaybeResponseMap>(
  schema: TResponse,
  responses: TResponses,
  input: unknown,
  status: number | undefined,
): ParseResult<HttpAnyResponseData<TResponse, TResponses>> {
  const selectedSchema = selectResponseSchema(schema, responses, status);

  if (selectedSchema !== undefined) {
    return selectedSchema.safeParse(input) as ParseResult<HttpAnyResponseData<TResponse, TResponses>>;
  }

  if (status !== undefined && responses !== undefined) {
    return failure([createUnexpectedStatusIssue(status, responses)]);
  }

  return success(input as HttpAnyResponseData<TResponse, TResponses>);
}

function prefixIssues(section: RequestSection, issues: readonly Issue[]): readonly Issue[] {
  return Object.freeze(
    issues.map((issue) =>
      Object.freeze({
        ...issue,
        path: Object.freeze([section, ...issue.path]),
      }),
    ),
  );
}

function freezeHttpContractConfig<
  TParams extends MaybeSchema,
  TQuery extends MaybeSchema,
  TBody extends MaybeSchema,
  TResponse extends MaybeSchema,
  THeaders extends MaybeSchema,
  TCookies extends MaybeSchema,
  TResponses extends MaybeResponseMap,
>(
  config: HttpContractConfig<TParams, TQuery, TBody, TResponse, THeaders, TCookies, TResponses>,
): HttpContractConfig<TParams, TQuery, TBody, TResponse, THeaders, TCookies, TResponses> {
  return Object.freeze({
    ...config,
    ...(config.responses === undefined ? {} : { responses: Object.freeze({ ...config.responses }) as TResponses }),
  });
}

function selectResponseSchema<TResponse extends MaybeSchema, TResponses extends MaybeResponseMap>(
  schema: TResponse,
  responses: TResponses,
  status: number | undefined,
): Schema<any> | undefined {
  if (status !== undefined && responses !== undefined && Object.prototype.hasOwnProperty.call(responses, status)) {
    return responses[status];
  }

  return schema;
}

function createUnexpectedStatusIssue(status: number, responses: Readonly<Record<number, Schema<any>>>): Issue {
  const expectedStatuses = Object.keys(responses).sort((left, right) => Number(left) - Number(right));

  return Object.freeze({
    code: "custom",
    path: Object.freeze(["response", "status"]),
    expected: expectedStatuses.length === 0 ? "configured response status" : expectedStatuses.join(" | "),
    received: String(status),
    message: `Unexpected response status ${status}.`,
    suggestion: "Pass a status with a configured response schema or add a fallback response schema.",
  });
}
