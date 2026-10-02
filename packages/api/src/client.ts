import { type ValidationError, type Warning } from "@safe-shape/core";
import { apiContract, assertKeys, assertRecord, type ApiContract, type HttpEndpoint, type InferEndpointRequest, type InferEndpointResponse } from "./catalog.js";
export { apiContract, httpEndpoint } from "./catalog.js";
export type { ApiContract, ApiSchema, EndpointRequest, HttpEndpoint, HttpEndpointConfig, HttpMethod, InferEndpointRequest, InferEndpointResponse } from "./catalog.js";

export interface ApiClientOptions {
  /** Absolute HTTP(S) base URL. Its path is retained as a prefix. */
  readonly baseUrl: string;
  readonly fetch?: typeof globalThis.fetch;
}
export interface ApiCallOptions {
  readonly signal?: AbortSignal;
}
export type ApiClientFailure =
  | Readonly<{ success: false; kind: "request-validation" | "response-validation"; error: ValidationError; status?: number }>
  | Readonly<{ success: false; kind: "serialization" | "network" | "decoding"; message: string; status?: number }>
  | Readonly<{ success: false; kind: "unexpected-status"; status: number }>;
export type ApiClientResult<T extends HttpEndpoint> =
  | (InferEndpointResponse<T> & Readonly<{ success: true; requestWarnings: readonly Warning[]; responseWarnings: readonly Warning[] }>)
  | (ApiClientFailure & Readonly<{ requestWarnings: readonly Warning[] }>);
export type ApiClient<T extends ApiContract> = {
  readonly [K in keyof T["endpoints"]]: (
    input: InferEndpointRequest<T["endpoints"][K]>, options?: ApiCallOptions,
  ) => Promise<ApiClientResult<T["endpoints"][K]>>;
};
const EMPTY_WARNINGS: readonly Warning[] = Object.freeze([]);

export function createApiClient<const T extends ApiContract>(api: T, options: ApiClientOptions): ApiClient<T> {
  const catalog = apiContract(api.endpoints);
  const base = new URL(options.baseUrl);
  if (!["http:", "https:"].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw new TypeError("Base URL must be HTTP(S) without credentials, query or fragment.");
  const fetcher = options.fetch ?? globalThis.fetch;
  if (typeof fetcher !== "function") throw new TypeError("A fetch implementation is required.");
  const client: Record<string, unknown> = Object.create(null);
  for (const [id, endpoint] of Object.entries(catalog.endpoints)) {
    client[id] = (input: InferEndpointRequest<HttpEndpoint>, callOptions: ApiCallOptions = {}) => callEndpoint(endpoint, input, callOptions, base, fetcher);
  }
  return Object.freeze(client) as ApiClient<T>;
}

async function callEndpoint(
  endpoint: HttpEndpoint, input: unknown, options: ApiCallOptions, base: URL, fetcher: typeof globalThis.fetch,
): Promise<ApiClientResult<HttpEndpoint>> {
  // Retain the HTTP helper's ordered paths, async rules and warnings.
  try {
    assertRecord(input, "Client request");
    assertKeys(input, Object.keys(endpoint.config.request ?? {}));
  } catch {
    return Object.freeze({ success: false, kind: "serialization", message: "Client input must contain only declared request sections.", requestWarnings: EMPTY_WARNINGS });
  }
  const sections = input;
  const parsed = await endpoint.contract.safeParseRequestAsync({
    params: sections["params"] === undefined ? {} : sections["params"], query: sections["query"] === undefined ? {} : sections["query"], headers: sections["headers"] === undefined ? {} : sections["headers"], body: sections["body"],
  });
  if (!parsed.success) return Object.freeze({ success: false, kind: "request-validation", error: parsed.error, requestWarnings: parsed.error.warnings });
  const requestWarnings = parsed.warnings ?? EMPTY_WARNINGS;
  let url: URL;
  let init: RequestInit;
  try {
    const data = parsed.data as Record<string, unknown>;
    let path = endpoint.config.path;
    for (const [key, value] of Object.entries((data["params"] ?? {}) as object)) {
      if (typeof value !== "string" || !value.length || value === "." || value === "..") throw new TypeError("Invalid path segment.");
      path = path.replace(`{${key}}`, encodeURIComponent(value));
    }
    url = new URL(base.href);
    url.pathname = base.pathname.replace(/\/$/, "") + path;
    const query = (data["query"] ?? {}) as Record<string, unknown>;
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined) continue;
      for (const item of Array.isArray(value) ? value : [value]) {
        if (!["string", "number", "boolean"].includes(typeof item) || (typeof item === "number" && (!Number.isFinite(item) || Object.is(item, -0)))) throw new TypeError("Invalid query value.");
        url.searchParams.append(key, String(item));
      }
    }
    const headers = new Headers({ accept: "application/json" });
    for (const [key, value] of Object.entries((data["headers"] ?? {}) as object)) {
      if (value !== undefined) {
        if (typeof value !== "string") throw new TypeError("Invalid header value.");
        headers.set(key, value);
        if (headers.get(key) !== value) throw new TypeError("Headers cannot silently normalize values.");
      }
    }
    init = { method: endpoint.config.method.toUpperCase(), headers, redirect: "error", ...(options.signal === undefined ? {} : { signal: options.signal }) };
    if (endpoint.config.request?.body !== undefined && data["body"] !== undefined) {
      init.body = serializeJson(data["body"]);
      headers.set("content-type", "application/json");
    }
  } catch {
    return Object.freeze({ success: false, kind: "serialization", message: "Request cannot be represented by this endpoint's wire format.", requestWarnings });
  }
  let response: Response;
  try {
    response = await fetcher(url, init);
  } catch {
    return Object.freeze({ success: false, kind: "network", message: "HTTP transport failed or was aborted.", requestWarnings });
  }
  const status = response.status;
  if (!Object.hasOwn(endpoint.config.responses, status)) {
    try { await response.body?.cancel(); } catch { /* Discard failures cannot turn an undeclared status into success. */ }
    return Object.freeze({ success: false, kind: "unexpected-status", status, requestWarnings });
  }
  const schema = endpoint.config.responses[status];
  let wire: unknown;
  try {
    const text = await response.text();
    if (schema === null) {
      if (text !== "") throw new TypeError("Expected no response body.");
      return Object.freeze({ success: true, status, data: undefined, requestWarnings, responseWarnings: EMPTY_WARNINGS });
    }
    const contentType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
    if (contentType !== "application/json" && !/^application\/[a-z0-9!#$&^_.+-]+\+json$/.test(contentType ?? "")) throw new TypeError("Expected JSON content type.");
    wire = JSON.parse(text);
  } catch {
    return Object.freeze({ success: false, kind: "decoding", status, message: "Response does not match the declared JSON/no-body representation.", requestWarnings });
  }
  const result = await endpoint.contract.safeParseResponseAsync(wire, status);
  if (!result.success) return Object.freeze({ success: false, kind: "response-validation", status, error: result.error, requestWarnings });
  return Object.freeze({ success: true, status, data: result.data, requestWarnings, responseWarnings: result.warnings ?? EMPTY_WARNINGS });
}

// Prevent JSON.stringify from silently changing a validated value or invoking toJSON.
function serializeJson(value: unknown, ancestors = new Set<object>()): string {
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0))) return JSON.stringify(value);
  if (typeof value !== "object" || value === null || ancestors.has(value)) throw new TypeError("Not a lossless JSON value.");
  if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError("Not a plain JSON object.");
  ancestors.add(value);
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype || Reflect.ownKeys(value).length !== value.length + 1) throw new TypeError("Sparse or decorated arrays are not JSON values.");
    const items: string[] = [];
    for (let i = 0; i < value.length; i++) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
      if (!descriptor || !("value" in descriptor)) throw new TypeError("Array accessors are not JSON values.");
      items.push(serializeJson(descriptor.value, ancestors));
    }
    ancestors.delete(value);
    return `[${items.join(",")}]`;
  } else {
    const members: string[] = [];
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (typeof key !== "string" || !descriptor.enumerable || !("value" in descriptor)) throw new TypeError("Not a JSON data property.");
      members.push(`${JSON.stringify(key)}:${serializeJson(descriptor.value, ancestors)}`);
    }
    ancestors.delete(value);
    return `{${members.join(",")}}`;
  }
}
