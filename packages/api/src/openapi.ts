import { describeContract, type SchemaDefinition } from "@safe-shape/core";
import { safeToJsonSchema, type JsonSchemaExportIssue } from "@safe-shape/json-schema";
import { apiContract, type ApiContract, type ApiSchema } from "./catalog.js";

export type OpenApiDocument = Readonly<Record<string, unknown>>;
export interface OpenApiOptions {
  readonly title: string;
  readonly version: string;
}
export interface OpenApiExportIssue {
  readonly code: "openapi.schema.unsupported" | "openapi.contract.invalid";
  readonly message: string;
  readonly path: readonly (string | number)[];
  readonly cause?: JsonSchemaExportIssue;
}
export type OpenApiExportResult =
  | Readonly<{ success: true; document: OpenApiDocument }>
  | Readonly<{ success: false; issues: readonly OpenApiExportIssue[] }>;
export class OpenApiExportError extends TypeError {
  readonly issues: readonly OpenApiExportIssue[];
  constructor(issues: readonly OpenApiExportIssue[]) {
    super(issues.map((issue) => issue.message).join(" "));
    this.name = "OpenApiExportError";
    this.issues = Object.freeze(issues.map((issue) => Object.freeze({ ...issue, path: Object.freeze([...issue.path]) })));
  }
}

export function toOpenApi(api: ApiContract, options: OpenApiOptions): OpenApiDocument {
  const result = safeToOpenApi(api, options);
  if (!result.success) throw new OpenApiExportError(result.issues);
  return result.document;
}
export function safeToOpenApi(api: ApiContract, options: OpenApiOptions): OpenApiExportResult {
  const issues: OpenApiExportIssue[] = [];
  try {
    if (typeof options.title !== "string" || !options.title.trim() || typeof options.version !== "string" || !options.version.trim()) throw new TypeError("OpenAPI title and version must be non-empty strings.");
    const catalog = apiContract(api.endpoints);
    const paths: Record<string, Record<string, unknown>> = Object.create(null);
    const schemas: Record<string, unknown> = Object.create(null);
    let componentIndex = 0;
    function convert(schema: ApiSchema, path: readonly (string | number)[]): Record<string, unknown> | undefined {
      const result = safeToJsonSchema(schema, { target: "draft-2020-12", side: "input" });
      if (!result.success) {
        issues.push(...result.issues.map((cause) => Object.freeze({ code: "openapi.schema.unsupported" as const, path: Object.freeze([...path, ...cause.path]), message: cause.message, cause })));
        return undefined;
      }
      const invalidPath = nonJsonArtifactPath(result.schema, []);
      if (invalidPath !== undefined) {
        issues.push(Object.freeze({ code: "openapi.schema.unsupported", path: Object.freeze([...path, ...invalidPath]), message: "Schema contains a value that cannot be exported losslessly as JSON." }));
        return undefined;
      }
      const name = `Schema${++componentIndex}`;
      const pointer = `#/components/schemas/${name}`;
      schemas[name] = rebaseSchema(result.schema, pointer);
      return { $ref: pointer };
    }
    for (const [id, endpoint] of Object.entries(catalog.endpoints)) {
      const config = endpoint.config;
      const parameters: unknown[] = [];
      const requestSchemas: Record<string, unknown> = Object.create(null);
      for (const section of ["params", "query", "headers"] as const) {
        const schema = config.request?.[section];
        if (!schema) continue;
        // Export the complete object as well: object-level opaque rules must not be lost.
        const ref = convert(schema, [id, "request", section]);
        if (!ref) continue;
        requestSchemas[section] = ref;
        const root = schemas[(ref["$ref"] as string).split("/").at(-1)!] as Record<string, unknown>;
        const properties = root["properties"] as Record<string, unknown>;
        const required = root["required"] as readonly string[] | undefined;
        for (const key of Object.keys(properties).sort()) {
          parameters.push({ name: key, in: section === "params" ? "path" : section === "headers" ? "header" : "query", required: section === "params" || (required?.includes(key) ?? false), style: section === "query" ? "form" : "simple", explode: section === "query", schema: properties[key] });
        }
      }
      const responses: Record<string, unknown> = Object.create(null);
      for (const [status, schema] of Object.entries(config.responses).sort(([a], [b]) => Number(a) - Number(b))) {
        responses[status] = schema === null ? { description: "No response body" } : {
          description: `HTTP ${status}`,
          content: { "application/json": { schema: convert(schema, [id, "responses", status]) } },
        };
      }
      const body = config.request?.body;
      const operation = {
        operationId: id,
        ...(config.summary === undefined ? {} : { summary: config.summary }),
        ...(config.description === undefined ? {} : { description: config.description }),
        ...(parameters.length ? { parameters } : {}),
        ...(Object.keys(requestSchemas).length ? { "x-safe-shape-request-schemas": requestSchemas } : {}),
        ...(body === undefined ? {} : { requestBody: { required: !acceptsAbsence(body), content: { "application/json": { schema: convert(body, [id, "request", "body"]) } } } }),
        responses,
      };
      paths[config.path] ??= Object.create(null) as Record<string, unknown>;
      paths[config.path]![config.method] = operation;
    }
    if (issues.length) return Object.freeze({ success: false, issues: Object.freeze(issues) });
    const document = freezeJson({ openapi: "3.1.0", info: { title: options.title, version: options.version }, jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema", paths, components: { schemas } });
    return Object.freeze({ success: true, document });
  } catch (error) {
    issues.push(Object.freeze({ code: "openapi.contract.invalid", message: error instanceof Error ? error.message : "Invalid API catalog.", path: Object.freeze([]) }));
    return Object.freeze({ success: false, issues: Object.freeze(issues) });
  }
}

function rebaseSchema(value: unknown, pointer: string): unknown {
  if (Array.isArray(value)) return value.map((item) => rebaseSchema(item, pointer));
  if (value === null || typeof value !== "object") return value;
  const output: Record<string, unknown> = Object.create(null);
  for (const [key, item] of Object.entries(value)) {
    if (key === "$ref" && typeof item === "string" && item.startsWith("#/")) output[key] = pointer + item.slice(1).split("/").map(encodeURIComponent).join("/");
    else if (key === "examples" || key === "enum" || key === "const") output[key] = item;
    else output[key] = rebaseSchema(item, pointer);
  }
  // Native format validation is stricter than generic JSON Schema annotation.
  if (typeof output["format"] === "string") output["x-safe-shape-format"] = output["format"];
  if (typeof output["pattern"] === "string") output["x-safe-shape-pattern-mode"] = "ecmascript-unicode";
  return output;
}
function nonJsonArtifactPath(value: unknown, path: readonly (string | number)[]): readonly (string | number)[] | undefined {
  if (value === null || typeof value === "string" || typeof value === "boolean") return undefined;
  if (typeof value === "number") return Number.isFinite(value) && !Object.is(value, -0) ? undefined : path;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index++) {
      const invalid = nonJsonArtifactPath(value[index], [...path, index]);
      if (invalid !== undefined) return invalid;
    }
    return undefined;
  }
  if (typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      const invalid = nonJsonArtifactPath(item, [...path, key]);
      if (invalid !== undefined) return invalid;
    }
    return undefined;
  }
  return path;
}
function acceptsAbsence(schema: ApiSchema): boolean {
  const graph = describeContract(schema).input;
  const seen = new Set<SchemaDefinition>();
  function visit(node: SchemaDefinition): boolean {
    if (seen.has(node)) return false;
    seen.add(node);
    let accepted = false;
    if (node.kind === "optional" || node.kind === "unknown") accepted = true;
    else if (node.kind === "literal") accepted = node.value === undefined;
    else if (node.kind === "union") accepted = node.choices.some(visit);
    else if (node.kind === "intersection") accepted = visit(node.left) && visit(node.right);
    else if (node.kind === "reference") accepted = visit(graph.definitions[node.id]!);
    seen.delete(node);
    return accepted;
  }
  return visit(graph.root);
}
export function freezeJson<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const item of Object.values(value)) freezeJson(item);
    Object.freeze(value);
  }
  return value;
}
