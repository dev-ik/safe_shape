import { describeContract, type InferInput, type InferOutput, type Schema, type SchemaDefinition } from "@safe-shape/core";
import { httpContract, type HttpContract } from "@safe-shape/http";

export type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "head" | "options";
export type ApiSchema = Schema<any, any>;
export interface EndpointRequest {
  readonly params?: ApiSchema;
  readonly query?: ApiSchema;
  readonly headers?: ApiSchema;
  readonly body?: ApiSchema;
}
export interface HttpEndpointConfig {
  readonly method: HttpMethod;
  readonly path: string;
  readonly request?: EndpointRequest;
  readonly responses: Readonly<Record<number, ApiSchema | null>>;
  readonly summary?: string;
  readonly description?: string;
}
export interface HttpEndpoint<TConfig extends HttpEndpointConfig = HttpEndpointConfig> {
  readonly config: TConfig;
  readonly contract: HttpContract<any, any, any, any, any, any, any>;
}
export interface ApiContract<TEndpoints extends Readonly<Record<string, HttpEndpoint>> = Readonly<Record<string, HttpEndpoint>>> {
  readonly endpoints: TEndpoints;
}
type InputSection<T> = T extends ApiSchema ? InferInput<T> : never;
type RequestInput<T extends EndpointRequest> = {
  readonly [K in keyof T as undefined extends InputSection<T[K]> ? never : K]: InputSection<T[K]>;
} & {
  readonly [K in keyof T as undefined extends InputSection<T[K]> ? K : never]?: InputSection<T[K]>;
};
export type InferEndpointRequest<T extends HttpEndpoint> =
  T["config"] extends { readonly request: infer R extends EndpointRequest } ? RequestInput<R> : Readonly<Record<string, never>>;
type ResponseOutput<T> = T extends ApiSchema ? InferOutput<T> : undefined;
export type InferEndpointResponse<T extends HttpEndpoint> = {
  [S in keyof T["config"]["responses"]]: Readonly<{
    status: S extends number ? S : S extends `${infer N extends number}` ? N : never;
    data: ResponseOutput<T["config"]["responses"][S]>;
  }>;
}[keyof T["config"]["responses"]];

const METHODS = new Set(["get", "post", "put", "patch", "delete", "head", "options"]);
export const REQUEST_SECTIONS = ["params", "query", "headers", "body"] as const;

export function httpEndpoint<const T extends HttpEndpointConfig>(config: T): HttpEndpoint<T> {
  assertRecord(config, "Endpoint");
  assertKeys(config, ["method", "path", "request", "responses", "summary", "description"]);
  validateRoute(config.method, config.path);
  for (const key of ["summary", "description"] as const) {
    if (config[key] !== undefined && typeof config[key] !== "string") throw new TypeError(`Endpoint ${key} must be a string.`);
  }
  const request = config.request ?? {};
  assertRecord(request, "Endpoint request");
  assertKeys(request, REQUEST_SECTIONS);
  if ((config.method === "get" || config.method === "head") && request.body !== undefined) throw new TypeError("GET/HEAD endpoints cannot declare a body.");
  const placeholders = pathParameters(config.path);
  for (const section of REQUEST_SECTIONS) {
    const schema = request[section];
    if (schema === undefined) continue;
    const graph = describeContract(schema as ApiSchema).input;
    validateWireGraph(graph.root, graph.definitions);
    if (section !== "body") validateParameterObject(graph.root, section, placeholders);
  }
  if (placeholders.length && request.params === undefined) throw new TypeError("Path placeholders require a params schema.");
  assertRecord(config.responses, "Endpoint responses");
  if (!Object.keys(config.responses).length) throw new TypeError("Endpoint requires at least one response status.");
  const responses: Record<string, ApiSchema | null> = Object.create(null);
  const schemas: Record<number, ApiSchema> = Object.create(null);
  for (const [status, schema] of Object.entries(config.responses)) {
    validateStatus(status);
    if ((config.method === "head" || [204, 205, 304].includes(Number(status))) && schema !== null) throw new TypeError("HEAD and 204/205/304 responses require null (no body).");
    if (schema !== null) {
      const graph = describeContract(schema).input;
      validateWireGraph(graph.root, graph.definitions);
      schemas[Number(status)] = schema;
    }
    responses[status] = schema;
  }
  const frozenConfig = Object.freeze({ ...config, request: Object.freeze({ ...request }), responses: Object.freeze(responses) }) as T;
  return Object.freeze({ config: frozenConfig, contract: httpContract({ ...request, responses: schemas }) });
}

export function apiContract<const T extends Readonly<Record<string, HttpEndpoint>>>(endpoints: T): ApiContract<T> {
  assertRecord(endpoints, "API endpoints");
  const copied: Record<string, HttpEndpoint> = Object.create(null);
  const routes = new Set<string>();
  for (const id of Object.keys(endpoints).sort()) {
    validateOperationId(id);
    const candidate = endpoints[id];
    if (candidate === undefined) throw new TypeError("Invalid endpoint.");
    const endpoint = httpEndpoint(candidate.config);
    const route = `${endpoint.config.method} ${endpoint.config.path.replace(/\{[^}]+\}/g, "{}")}`;
    if (routes.has(route)) throw new TypeError("Duplicate method/path template in API catalog.");
    routes.add(route);
    copied[id] = endpoint;
  }
  return Object.freeze({ endpoints: Object.freeze(copied) as T });
}

export function validateOperationId(id: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_.-]*$/.test(id)) throw new TypeError("Operation ids must be non-empty stable identifiers.");
}
export function pathParameters(path: string): readonly string[] {
  return [...path.matchAll(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g)].map((match) => match[1]!);
}
export function validateRoute(method: string, path: string): void {
  if (!METHODS.has(method)) throw new TypeError("Unsupported endpoint method.");
  if (typeof path !== "string" || !path.startsWith("/") || path.includes("//") ||
      !/^\/(?:[A-Za-z0-9_~.\/-]|\{[A-Za-z_][A-Za-z0-9_]*\})*$/.test(path) ||
      path.split("/").some((part) => part === "." || part === "..")) throw new TypeError("Invalid endpoint path template.");
  const params = pathParameters(path);
  if (new Set(params).size !== params.length) throw new TypeError("Duplicate path placeholder.");
}
export function validateStatus(status: string): void {
  if (!/^[2-5][0-9]{2}$/.test(status)) throw new TypeError("Response status must be an integer from 200 through 599.");
}
export function assertRecord(value: unknown, name: string): asserts value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value) ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError(`${name} must be a plain record.`);
  if (Reflect.ownKeys(value).some((key) => typeof key !== "string" || !Object.getOwnPropertyDescriptor(value, key)?.enumerable || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, "value"))) throw new TypeError(`${name} requires enumerable data properties.`);
}
export function assertKeys(value: object, allowed: readonly string[]): void {
  if (Object.keys(value).some((key) => !allowed.includes(key))) throw new TypeError("Unknown configuration property.");
}

export function validateParameterObject(root: SchemaDefinition, section: "params" | "query" | "headers", placeholders: readonly string[]): void {
  if (root.kind !== "object" || root.unknownProperties !== "reject") throw new TypeError(`${section} must be a strict object schema.`);
  if (section === "params" && (root.required.length !== placeholders.length || Object.keys(root.shape).length !== placeholders.length || placeholders.some((key) => !root.required.includes(key)))) throw new TypeError("Params must exactly match required path placeholders.");
  for (const [key, field] of Object.entries(root.shape)) {
    let node = field;
    if (node.kind === "optional") node = node.inner;
    if (section === "headers" && (!/^[!#$%&'*+.^_`|~0-9a-z-]+$/.test(key) || ["accept", "content-type", "cookie"].includes(key))) throw new TypeError("Headers require lower-case HTTP token names; accept/content-type/cookie are transport-owned.");
    if (section === "query" && node.kind === "array") {
      if ((node.constraints?.minLength ?? 0) < 1) throw new TypeError("Query arrays require minLength >= 1; use an optional field for absence.");
      node = node.item;
    }
    if (!scalarNode(node, section === "query")) throw new TypeError(`${section} contains an unsupported wire parameter.`);
  }
}
function scalarNode(node: SchemaDefinition, numeric: boolean): boolean {
  if (node.kind === "string") return true;
  if (numeric && (node.kind === "number" || node.kind === "boolean")) return true;
  if (node.kind === "literal") return typeof node.value === "string" || (numeric && ["number", "boolean"].includes(typeof node.value));
  if (node.kind === "enum") return node.values.every((value) => typeof value === "string" || numeric);
  if (node.kind === "union") return node.choices.every((choice) => scalarNode(choice, numeric));
  return false;
}

// Introspection only: never execute user predicates or mappers.
export function validateWireGraph(root: SchemaDefinition, definitions: Readonly<Record<string, SchemaDefinition>>): void {
  const seen = new Set<SchemaDefinition>();
  function visit(node: SchemaDefinition): void {
    if (seen.has(node)) return;
    seen.add(node);
    if (node.kind === "transform" || node.kind === "opaque" || (node.kind === "object" && node.unknownProperties === "strip")) throw new TypeError("Wire schemas cannot transform values or strip object properties.");
    switch (node.kind) {
      case "object": Object.values(node.shape).forEach(visit); break;
      case "record": visit(node.value); break;
      case "array": visit(node.item); break;
      case "tuple": node.items.forEach(visit); break;
      case "union": case "discriminatedUnion": node.choices.forEach(visit); break;
      case "intersection": visit(node.left); visit(node.right); break;
      case "optional": case "nullable": visit(node.inner); break;
      case "reference": {
        const target = definitions[node.id];
        if (!target) throw new TypeError("Missing wire schema reference.");
        visit(target); break;
      }
    }
  }
  visit(root);
}
