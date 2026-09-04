import {
  ValidationError,
  createIssue,
  failure,
  success,
  type Infer,
  type Issue,
  type ParseResult,
  type Schema,
  type Warning,
} from "@safe-shape/core";

type MaybeSchema = Schema<any, any> | undefined;
type MaybeResponseMap = Readonly<Record<number, Schema<any, any>>> | undefined;

type Expand<T> = {
  [Key in keyof T]: T[Key];
} & {};

type SectionOutput<TKey extends string, TSchema extends MaybeSchema> =
  TSchema extends Schema<any, any> ? { readonly [Key in TKey]: Infer<TSchema> } : {};

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
  TResponse extends Schema<any, any> ? Infer<TResponse> : unknown;

export type HttpMappedResponseData<TResponses extends MaybeResponseMap> =
  TResponses extends Readonly<Record<number, Schema<any, any>>>
    ? Infer<TResponses[Extract<keyof TResponses, number>]>
    : never;

export type HttpAnyResponseData<
  TResponse extends MaybeSchema,
  TResponses extends MaybeResponseMap,
> = TResponses extends Readonly<Record<number, Schema<any, any>>>
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
  safeParseRequestAsync(
    input: HttpRequestInput,
  ): Promise<ParseResult<HttpRequestData<TParams, TQuery, TBody, THeaders, TCookies>>>;
  parseRequestAsync(
    input: HttpRequestInput,
  ): Promise<HttpRequestData<TParams, TQuery, TBody, THeaders, TCookies>>;
  safeParseResponse(input: unknown, status?: number): ParseResult<HttpAnyResponseData<TResponse, TResponses>>;
  parseResponse(input: unknown, status?: number): HttpAnyResponseData<TResponse, TResponses>;
  safeParseResponseAsync(
    input: unknown,
    status?: number,
  ): Promise<ParseResult<HttpAnyResponseData<TResponse, TResponses>>>;
  parseResponseAsync(
    input: unknown,
    status?: number,
  ): Promise<HttpAnyResponseData<TResponse, TResponses>>;
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

export type HttpResponseRecoveryOptions =
  | {
      readonly status?: number;
      readonly fallback: unknown;
      readonly getFallback?: never;
    }
  | {
      readonly status?: number;
      readonly getFallback: () => unknown;
      readonly fallback?: never;
    };

export type HttpResponseRecoveryResult<TData> =
  | {
      readonly kind: "valid";
      readonly data: TData;
      readonly warnings?: readonly Warning[];
    }
  | {
      readonly kind: "recovered";
      readonly data: TData;
      readonly networkError: ValidationError;
      readonly warnings?: readonly Warning[];
    }
  | {
      readonly kind: "unavailable";
      readonly networkError: ValidationError;
      readonly fallbackError: ValidationError;
    };

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
    safeParseRequestAsync(input: HttpRequestInput) {
      return safeParseRequestAsync(frozenConfig, input);
    },
    async parseRequestAsync(input: HttpRequestInput) {
      const result = await safeParseRequestAsync(frozenConfig, input);
      if (!result.success) throw result.error;
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
    safeParseResponseAsync(input: unknown, status?: number) {
      return safeParseResponseAsync(
        frozenConfig.response,
        frozenConfig.responses,
        input,
        status,
      );
    },
    async parseResponseAsync(input: unknown, status?: number) {
      const result = await safeParseResponseAsync(
        frozenConfig.response,
        frozenConfig.responses,
        input,
        status,
      );
      if (!result.success) throw result.error;
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

export function safeParseHttpRequestAsync<
  TContract extends HttpContract<any, any, any, any, any, any, any>,
>(
  contract: TContract,
  input: HttpRequestInput,
): Promise<ParseResult<InferHttpRequest<TContract>>> {
  return contract.safeParseRequestAsync(input) as Promise<ParseResult<InferHttpRequest<TContract>>>;
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

export async function parseHttpRequestAsync<
  TContract extends HttpContract<any, any, any, any, any, any, any>,
>(contract: TContract, input: HttpRequestInput): Promise<InferHttpRequest<TContract>> {
  const result = await safeParseHttpRequestAsync(contract, input);
  if (!result.success) throw result.error;
  return result.data;
}

export function safeParseHttpResponse<TContract extends HttpContract<any, any, any, any, any, any, any>>(
  contract: TContract,
  input: unknown,
  status?: number,
): ParseResult<InferHttpResponse<TContract>> {
  return contract.safeParseResponse(input, status) as ParseResult<InferHttpResponse<TContract>>;
}

export function safeParseHttpResponseAsync<
  TContract extends HttpContract<any, any, any, any, any, any, any>,
>(
  contract: TContract,
  input: unknown,
  status?: number,
): Promise<ParseResult<InferHttpResponse<TContract>>> {
  return contract.safeParseResponseAsync(input, status) as Promise<
    ParseResult<InferHttpResponse<TContract>>
  >;
}

export function recoverHttpResponse<
  TContract extends HttpContract<any, any, any, any, any, any, any>,
>(
  contract: TContract,
  input: unknown,
  options: HttpResponseRecoveryOptions,
): HttpResponseRecoveryResult<InferHttpResponse<TContract>> {
  const hasFallback = Object.prototype.hasOwnProperty.call(options, "fallback");
  const hasGetFallback = Object.prototype.hasOwnProperty.call(options, "getFallback");

  if (hasFallback === hasGetFallback) {
    throw new TypeError("Response recovery requires exactly one of fallback or getFallback.");
  }

  let getFallback: (() => unknown) | undefined;
  if (hasGetFallback) {
    const candidate = options.getFallback;
    if (typeof candidate !== "function") {
      throw new TypeError("Response recovery getFallback must be a function.");
    }
    getFallback = candidate;
  }

  const current = safeParseHttpResponse(contract, input, options.status);
  if (current.success) {
    return Object.freeze({
      kind: "valid",
      data: current.data,
      ...(current.warnings === undefined ? {} : { warnings: current.warnings }),
    });
  }

  const fallbackInput = getFallback === undefined ? options.fallback : getFallback();
  const fallback = safeParseHttpResponse(contract, fallbackInput, options.status);
  if (fallback.success) {
    return Object.freeze({
      kind: "recovered",
      data: fallback.data,
      networkError: current.error,
      ...(fallback.warnings === undefined ? {} : { warnings: fallback.warnings }),
    });
  }

  return Object.freeze({
    kind: "unavailable",
    networkError: current.error,
    fallbackError: fallback.error,
  });
}

export async function recoverHttpResponseAsync<
  TContract extends HttpContract<any, any, any, any, any, any, any>,
>(
  contract: TContract,
  input: unknown,
  options: HttpResponseRecoveryOptions,
): Promise<HttpResponseRecoveryResult<InferHttpResponse<TContract>>> {
  const hasFallback = Object.prototype.hasOwnProperty.call(options, "fallback");
  const hasGetFallback = Object.prototype.hasOwnProperty.call(options, "getFallback");
  if (hasFallback === hasGetFallback) {
    throw new TypeError("Response recovery requires exactly one of fallback or getFallback.");
  }
  let getFallback: (() => unknown) | undefined;
  if (hasGetFallback) {
    const candidate = options.getFallback;
    if (typeof candidate !== "function") {
      throw new TypeError("Response recovery getFallback must be a function.");
    }
    getFallback = candidate;
  }
  const current = await safeParseHttpResponseAsync(contract, input, options.status);
  if (current.success) {
    return Object.freeze({
      kind: "valid",
      data: current.data,
      ...(current.warnings === undefined ? {} : { warnings: current.warnings }),
    });
  }
  const fallbackInput = getFallback === undefined ? options.fallback : getFallback();
  const fallback = await safeParseHttpResponseAsync(contract, fallbackInput, options.status);
  if (fallback.success) {
    return Object.freeze({
      kind: "recovered",
      data: fallback.data,
      networkError: current.error,
      ...(fallback.warnings === undefined ? {} : { warnings: fallback.warnings }),
    });
  }
  return Object.freeze({
    kind: "unavailable",
    networkError: current.error,
    fallbackError: fallback.error,
  });
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

export async function parseHttpResponseAsync<
  TContract extends HttpContract<any, any, any, any, any, any, any>,
>(contract: TContract, input: unknown, status?: number): Promise<InferHttpResponse<TContract>> {
  const result = await safeParseHttpResponseAsync(contract, input, status);
  if (!result.success) throw result.error;
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
  const warnings: Warning[] = [];

  parseRequestSection(config.params, "params", input.params, output, issues, warnings);
  parseRequestSection(config.query, "query", input.query, output, issues, warnings);
  parseRequestSection(config.body, "body", input.body, output, issues, warnings);
  parseRequestSection(config.headers, "headers", input.headers, output, issues, warnings);
  parseRequestSection(config.cookies, "cookies", input.cookies, output, issues, warnings);

  return issues.length === 0
    ? success(Object.freeze(output) as HttpRequestData<TParams, TQuery, TBody, THeaders, TCookies>, warnings)
    : failure(issues, warnings);
}

async function safeParseRequestAsync<
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
): Promise<ParseResult<HttpRequestData<TParams, TQuery, TBody, THeaders, TCookies>>> {
  const output: Record<string, unknown> = {};
  const issues: Issue[] = [];
  const warnings: Warning[] = [];
  await parseRequestSectionAsync(config.params, "params", input.params, output, issues, warnings);
  await parseRequestSectionAsync(config.query, "query", input.query, output, issues, warnings);
  await parseRequestSectionAsync(config.body, "body", input.body, output, issues, warnings);
  await parseRequestSectionAsync(config.headers, "headers", input.headers, output, issues, warnings);
  await parseRequestSectionAsync(config.cookies, "cookies", input.cookies, output, issues, warnings);
  return issues.length === 0
    ? success(Object.freeze(output) as HttpRequestData<TParams, TQuery, TBody, THeaders, TCookies>, warnings)
    : failure(issues, warnings);
}

function parseRequestSection(
  schema: MaybeSchema,
  section: RequestSection,
  value: unknown,
  output: Record<string, unknown>,
  issues: Issue[],
  warnings: Warning[],
): void {
  if (schema === undefined) {
    return;
  }

  const result = schema.safeParse(value);

  if (result.success) {
    output[section] = result.data;
    warnings.push(...prefixWarnings(section, result.warnings ?? []));
    return;
  }

  issues.push(...prefixIssues(section, result.error.issues));
  warnings.push(...prefixWarnings(section, result.error.warnings));
}

async function parseRequestSectionAsync(
  schema: MaybeSchema,
  section: RequestSection,
  value: unknown,
  output: Record<string, unknown>,
  issues: Issue[],
  warnings: Warning[],
): Promise<void> {
  if (schema === undefined) return;
  const result = await schema.safeParseAsync(value);
  if (result.success) {
    output[section] = result.data;
    warnings.push(...prefixWarnings(section, result.warnings ?? []));
  } else {
    issues.push(...prefixIssues(section, result.error.issues));
    warnings.push(...prefixWarnings(section, result.error.warnings));
  }
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

async function safeParseResponseAsync<
  TResponse extends MaybeSchema,
  TResponses extends MaybeResponseMap,
>(
  schema: TResponse,
  responses: TResponses,
  input: unknown,
  status: number | undefined,
): Promise<ParseResult<HttpAnyResponseData<TResponse, TResponses>>> {
  const selectedSchema = selectResponseSchema(schema, responses, status);
  if (selectedSchema !== undefined) {
    return selectedSchema.safeParseAsync(input) as Promise<
      ParseResult<HttpAnyResponseData<TResponse, TResponses>>
    >;
  }
  if (status !== undefined && responses !== undefined) {
    return failure([createUnexpectedStatusIssue(status, responses)]);
  }
  return success(input as HttpAnyResponseData<TResponse, TResponses>);
}

function prefixIssues(section: RequestSection, issues: readonly Issue[]): readonly Issue[] {
  return Object.freeze(issues.map((issue) => prefixIssue(section, issue)));
}

function prefixWarnings(section: RequestSection, warnings: readonly Warning[]): readonly Warning[] {
  return Object.freeze(warnings.map((warning) => Object.freeze({
    ...warning,
    path: Object.freeze([section, ...warning.path]),
  })));
}

function prefixIssue(section: RequestSection, issue: Issue): Issue {
  return Object.freeze({
    ...issue,
    path: Object.freeze([section, ...issue.path]),
    ...(issue.branches === undefined
      ? {}
      : {
          branches: Object.freeze(issue.branches.map((branch) => Object.freeze({
            index: branch.index,
            issues: prefixIssues(section, branch.issues),
            ...(branch.warnings === undefined
              ? {}
              : { warnings: prefixWarnings(section, branch.warnings) }),
          }))),
        }),
  });
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
): Schema<any, any> | undefined {
  if (status !== undefined && responses !== undefined && Object.prototype.hasOwnProperty.call(responses, status)) {
    return responses[status];
  }

  return schema;
}

function createUnexpectedStatusIssue(
  status: number,
  responses: Readonly<Record<number, Schema<any, any>>>,
): Issue {
  const expectedStatuses = Object.keys(responses).sort((left, right) => Number(left) - Number(right));

  return createIssue({
    code: "custom",
    path: ["response", "status"],
    expected: expectedStatuses.length === 0 ? "configured response status" : expectedStatuses.join(" | "),
    received: status,
    receivedDescription: String(status),
    message: `Unexpected response status ${status}.`,
    suggestion: "Pass a status with a configured response schema or add a fallback response schema.",
  });
}
