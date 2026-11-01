import { object, type Shape } from "@safe-shape/core";
import { compareContractsV2, type CompatibilityStatus, type GraphCompatibilityReport } from "@safe-shape/compat";
import {
  OpenApiReader, ImportFailure, asRecord, asString, flag, invalid, keys, readDocument, unsupported,
  type FormatPolicy, type ImportedSchema, type Path,
} from "./openapi-import.js";

export interface OpenApiCompareOptions {
  /** Formats are rejected unless their interpretation is explicitly selected. */
  readonly formatPolicy?: FormatPolicy;
}
export interface OpenApiCompareIssue {
  readonly source: "previous" | "next";
  readonly code: "openapi.document.invalid" | "openapi.feature.unsupported";
  readonly path: Path;
  readonly message: string;
}
export interface OpenApiCompatibilityFinding {
  readonly endpoint: string;
  readonly code: "openapi.operation.added" | "openapi.operation.removed" | "openapi.request.changed" | "openapi.response.changed" | "openapi.transport.changed";
  readonly status: CompatibilityStatus;
  readonly path: Path;
  readonly message: string;
  readonly comparison?: GraphCompatibilityReport;
}
export interface OpenApiCompatibilityReport {
  readonly compatible: boolean;
  readonly decision: "compatible" | "migration-required" | "manual-review";
  readonly findings: readonly OpenApiCompatibilityFinding[];
  readonly issues: readonly OpenApiCompareIssue[];
}

type Data = Record<string, unknown>;
interface Parameter { readonly schema: ImportedSchema; readonly required: boolean; readonly transport: string }
interface Content { readonly media: Readonly<Record<string, ImportedSchema>>; readonly required: boolean }
interface Response extends Content { readonly headers: ImportedSchema; readonly transport: Readonly<Record<string, string>> }
interface Operation {
  readonly path: Path;
  readonly parameters: Readonly<Record<string, Parameter>>;
  readonly body: Content;
  readonly responses: Readonly<Record<string, Response>>;
  readonly transport: string;
}
interface Document { readonly operations: Readonly<Record<string, Operation>>; readonly securitySchemes: string }
const METHODS = ["get", "put", "post", "delete", "options", "head", "patch", "trace"];
const EMPTY_MEDIA: Readonly<Record<string, ImportedSchema>> = Object.freeze(Object.create(null) as Record<string, ImportedSchema>);

/** Compare an OpenAPI server update against existing clients, without I/O. */
export function compareOpenApi(previous: unknown, next: unknown, options: OpenApiCompareOptions = {}): OpenApiCompatibilityReport {
  const formatPolicy = options.formatPolicy ?? "reject";
  if (!["reject", "annotation", "safe-shape"].includes(formatPolicy)) throw new TypeError("Invalid OpenAPI formatPolicy.");
  const issues: OpenApiCompareIssue[] = [];
  const findings: OpenApiCompatibilityFinding[] = [];
  const load = (input: unknown, source: "previous" | "next"): Document | undefined => {
    try { return importDocument(new OpenApiReader(readDocument(input), formatPolicy)); }
    catch (error) {
      if (!(error instanceof ImportFailure)) throw error;
      issues.push(Object.freeze({ source, code: error.code, path: Object.freeze([...error.path]), message: error.message }));
      return undefined;
    }
  };
  const before = load(previous, "previous"), after = load(next, "next");
  const finish = (): OpenApiCompatibilityReport => {
    const breaking = findings.some((finding) => finding.status === "breaking");
    const review = issues.length > 0 || findings.some((finding) => finding.status === "unknown" || finding.status === "risky");
    return Object.freeze({ compatible: !breaking && !review, decision: breaking ? "migration-required" : review ? "manual-review" : "compatible", findings: Object.freeze(findings), issues: Object.freeze(issues) });
  };
  if (!before || !after) return finish();
  function add(endpoint: string, code: OpenApiCompatibilityFinding["code"], status: CompatibilityStatus, path: Path, message: string, comparison?: GraphCompatibilityReport): void {
    findings.push(Object.freeze({ endpoint, code, status, path: Object.freeze([...path]), message, ...(comparison === undefined ? {} : { comparison }) }));
  }
  function compare(endpoint: string, first: ImportedSchema, second: ImportedSchema, path: Path, request: boolean): void {
    const comparison = compareContractsV2(first, second, { compatibility: request ? "backward" : "forward", side: "input" });
    add(endpoint, request ? "openapi.request.changed" : "openapi.response.changed", comparison.status, path,
      request ? "Existing request values must remain accepted." : "New response values must remain accepted by existing clients.", comparison);
  }
  function content(endpoint: string, first: Content, second: Content, path: Path, request: boolean): void {
    const code = request ? "openapi.request.changed" : "openapi.response.changed";
    if (request && !first.required && second.required) add(endpoint, code, "breaking", [...path, "required"], "A previously optional request body is now required.");
    const sources = request ? first.media : second.media;
    const targets = request ? second.media : first.media;
    if (!request && (Object.keys(first.media).length === 0) !== (Object.keys(second.media).length === 0)) {
      add(endpoint, code, "breaking", path, "Response changed between a body and no body.");
      return;
    }
    for (const media of Object.keys(sources).sort()) {
      if (!Object.hasOwn(targets, media)) add(endpoint, code, "breaking", [...path, "content", media], request ? "Previously accepted request media type removed." : "New response media type is not declared by existing clients.");
      else compare(endpoint, first.media[media]!, second.media[media]!, [...path, "content", media, "schema"], request);
    }
  }
  if (before.securitySchemes !== after.securitySchemes) add("*", "openapi.transport.changed", "unknown", ["components", "securitySchemes"], "Security scheme changes require manual review.");
  for (const endpoint of [...new Set([...Object.keys(before.operations), ...Object.keys(after.operations)])].sort()) {
    const first = before.operations[endpoint], second = after.operations[endpoint];
    if (!first) { add(endpoint, "openapi.operation.added", "safe", second!.path, "Operation added."); continue; }
    if (!second) { add(endpoint, "openapi.operation.removed", "breaking", first.path, "Operation removed or method/path changed."); continue; }
    if (first.transport !== second.transport) add(endpoint, "openapi.transport.changed", "unknown", second.path, "Security or server configuration changed; review transport behavior.");
    for (const id of [...new Set([...Object.keys(first.parameters), ...Object.keys(second.parameters)])].sort()) {
      const oldParameter = first.parameters[id], newParameter = second.parameters[id];
      const path = [...second.path, "parameters", id];
      if (!newParameter) {
        add(endpoint, "openapi.request.changed", "unknown", path, "Parameter removed; review how the server handles values sent by existing clients.");
        continue;
      }
      if (!oldParameter) {
        add(endpoint, "openapi.request.changed", newParameter.required ? "breaking" : "safe", path, newParameter.required ? "New required parameter." : "New optional parameter.");
        continue;
      }
      if (!oldParameter.required && newParameter.required) add(endpoint, "openapi.request.changed", "breaking", path, "A previously optional parameter is now required.");
      compare(endpoint, oldParameter.schema, newParameter.schema, path, true);
      if (oldParameter.transport !== newParameter.transport) add(endpoint, "openapi.transport.changed", "unknown", path, "Parameter serialization changed.");
    }
    content(endpoint, first.body, second.body, [...second.path, "requestBody"], true);
    // Compare every effective status, respecting explicit > range > default.
    // Deduplicate identical selector pairs so default responses produce one proof.
    const seen = new Set<string>();
    for (let status = 100; status <= 599; status++) {
      const select = (responses: Operation["responses"]): string | undefined => [String(status), `${Math.floor(status / 100)}XX`, "default"].find((key) => Object.hasOwn(responses, key));
      const oldKey = select(first.responses), newKey = select(second.responses);
      if (!oldKey && !newKey) continue;
      const pair = JSON.stringify([oldKey, newKey]);
      if (seen.has(pair)) continue;
      seen.add(pair);
      const path = [...second.path, "responses", newKey ?? oldKey!];
      if (!oldKey) { add(endpoint, "openapi.response.changed", "breaking", path, `New response status ${status} is not declared by existing clients.`); continue; }
      if (!newKey) { add(endpoint, "openapi.response.changed", "safe", path, "Server no longer declares these response statuses."); continue; }
      const oldResponse = first.responses[oldKey]!, newResponse = second.responses[newKey]!;
      content(endpoint, oldResponse, newResponse, path, false);
      compare(endpoint, oldResponse.headers, newResponse.headers, [...path, "headers"], false);
      for (const name of Object.keys(oldResponse.transport)) {
        if (Object.hasOwn(newResponse.transport, name) && oldResponse.transport[name] !== newResponse.transport[name]) add(endpoint, "openapi.transport.changed", "unknown", [...path, "headers", name], "Response header serialization changed.");
      }
    }
  }
  return finish();
}

function importDocument(reader: OpenApiReader): Document {
  const document = reader.document;
  const paths = asRecord(document["paths"], ["paths"]);
  const operations: Record<string, Operation> = Object.create(null);
  const routes = new Set<string>();
  const operationIds = new Set<string>();
  for (const route of Object.keys(paths).sort()) {
    if (route.startsWith("x-")) continue;
    if (!route.startsWith("/") || /[?#]/.test(route)) invalid(["paths", route], "Invalid OpenAPI path template.");
    const rawItem = asRecord(paths[route], ["paths", route]);
    if (Object.hasOwn(rawItem, "$ref") && Object.keys(rawItem).some((key) => key !== "$ref" && !key.startsWith("x-"))) unsupported(["paths", route], "Path item $ref siblings are not supported.");
    const { value: item, path: itemPath } = reader.resolve(rawItem, ["paths", route]);
    keys(item, [...METHODS, "summary", "description", "servers", "parameters"], itemPath);
    const inherited = parameters(reader, item["parameters"], [...itemPath, "parameters"]);
    for (const method of METHODS) {
      if (!Object.hasOwn(item, method)) continue;
      const path = ["paths", route, method];
      const sourcePath = [...itemPath, method];
      const operation = asRecord(item[method], sourcePath);
      keys(operation, ["tags", "summary", "description", "externalDocs", "operationId", "parameters", "requestBody", "responses", "deprecated", "security", "servers"], sourcePath);
      if (operation["operationId"] !== undefined) {
        const id = asString(operation["operationId"], [...sourcePath, "operationId"]);
        if (operationIds.has(id)) invalid([...sourcePath, "operationId"], "Duplicate operationId.");
        operationIds.add(id);
      }
      const canonical = `${method} ${route.replace(/\{[^}]+\}/g, "{}")}`;
      if (routes.has(canonical)) invalid(path, "Duplicate method/path template.");
      routes.add(canonical);
      const params = { ...inherited, ...parameters(reader, operation["parameters"], [...sourcePath, "parameters"]) };
      const placeholders = [...route.matchAll(/\{([^{}]+)\}/g)].map((match) => match[1]!);
      if (/[{}]/.test(route.replace(/\{[^{}]+\}/g, "")) || new Set(placeholders).size !== placeholders.length) invalid(path, "Invalid path placeholders.");
      for (const name of placeholders) if (!params[`path:${name}`]?.required) invalid(path, "Every path placeholder requires a required path parameter.");
      for (const id of Object.keys(params)) if (id.startsWith("path:") && !placeholders.includes(id.slice(5))) invalid(path, "Path parameter does not match a placeholder.");
      let body: Content = { media: EMPTY_MEDIA, required: false };
      if (operation["requestBody"] !== undefined) {
        const resolved = reader.resolve(operation["requestBody"], [...sourcePath, "requestBody"]);
        keys(resolved.value, ["description", "content", "required"], resolved.path);
        body = { media: media(reader, resolved.value["content"], [...resolved.path, "content"]), required: flag(resolved.value["required"], [...resolved.path, "required"]) };
        if (!Object.keys(body.media).length) invalid(resolved.path, "Request body content must not be empty.");
        if (method === "get" || method === "head" || method === "trace") unsupported(resolved.path, "Request bodies on GET/HEAD/TRACE require manual review.");
      }
      const rawResponses = asRecord(operation["responses"], [...sourcePath, "responses"]);
      const responses: Record<string, Response> = Object.create(null);
      for (const status of Object.keys(rawResponses).sort()) {
        if (status.startsWith("x-")) continue;
        if (!/^(?:[1-5][0-9]{2}|[1-5]XX|default)$/.test(status)) invalid([...sourcePath, "responses", status], "Invalid response status selector.");
        const resolved = reader.resolve(rawResponses[status], [...sourcePath, "responses", status]);
        keys(resolved.value, ["description", "headers", "content"], resolved.path);
        if (typeof resolved.value["description"] !== "string") invalid([...resolved.path, "description"], "Response requires a description.");
        const responseMedia = resolved.value["content"] === undefined ? EMPTY_MEDIA : media(reader, resolved.value["content"], [...resolved.path, "content"]);
        if ((method === "head" || ["204", "205", "304"].includes(status)) && Object.keys(responseMedia).length) unsupported(resolved.path, "No-body response cannot declare content.");
        const headers = responseHeaders(reader, resolved.value["headers"], [...resolved.path, "headers"]);
        responses[status] = { media: responseMedia, required: true, ...headers };
      }
      if (!Object.keys(responses).length) invalid([...sourcePath, "responses"], "Operation requires at least one response.");
      const servers = [operation["servers"], item["servers"], document["servers"], [{ url: "/" }]].find((value) => value !== undefined);
      const security = [operation["security"], document["security"], []].find((value) => value !== undefined);
      if (!Array.isArray(servers) || !Array.isArray(security)) invalid(sourcePath, "servers and security must be arrays.");
      operations[`${method.toUpperCase()} ${route}`] = { path, parameters: params, body, responses, transport: JSON.stringify([servers, security]) };
    }
  }
  const components = document["components"] === undefined ? {} : asRecord(document["components"], ["components"]);
  return { operations, securitySchemes: JSON.stringify(components["securitySchemes"] ?? {}) };
}

function parameters(reader: OpenApiReader, input: unknown, path: Path): Record<string, Parameter> {
  const result: Record<string, Parameter> = Object.create(null);
  if (input === undefined) return result;
  if (!Array.isArray(input)) invalid(path, "Parameters must be an array.");
  for (let index = 0; index < input.length; index++) {
    const resolved = reader.resolve(input[index], [...path, index]);
    const entry = resolved.value, at = resolved.path;
    keys(entry, ["name", "in", "description", "required", "deprecated", "allowEmptyValue", "style", "explode", "allowReserved", "schema", "example", "examples"], at);
    const location = asString(entry["in"], [...at, "in"]);
    if (!["path", "query", "header", "cookie"].includes(location)) invalid([...at, "in"], "Unsupported parameter location.");
    let name = asString(entry["name"], [...at, "name"]);
    if (location === "header") name = name.toLowerCase();
    if (location === "header" && ["accept", "content-type", "authorization"].includes(name)) unsupported(at, "Transport-owned header parameter requires manual review.");
    const id = `${location}:${name}`;
    if (Object.hasOwn(result, id)) invalid(at, "Duplicate parameter name/location.");
    const required = flag(entry["required"], [...at, "required"]);
    if (location === "path" && !required) invalid(at, "Path parameters must be required.");
    result[id] = { schema: reader.schema(entry["schema"], [...at, "schema"]), required, transport: serialization(entry, at, location) };
  }
  return result;
}

function serialization(entry: Data, path: Path, location: string): string {
  const style = entry["style"] ?? (location === "query" || location === "cookie" ? "form" : "simple");
  const allowed: Record<string, readonly string[]> = { path: ["matrix", "label", "simple"], query: ["form", "spaceDelimited", "pipeDelimited", "deepObject"], header: ["simple"], cookie: ["form"] };
  if (typeof style !== "string" || !allowed[location]!.includes(style)) invalid([...path, "style"], "Invalid parameter serialization style.");
  return JSON.stringify([style, flag(entry["explode"], [...path, "explode"], style === "form"), flag(entry["allowReserved"], [...path, "allowReserved"]), flag(entry["allowEmptyValue"], [...path, "allowEmptyValue"])]);
}

function media(reader: OpenApiReader, input: unknown, path: Path): Record<string, ImportedSchema> {
  const content = asRecord(input, path);
  const output: Record<string, ImportedSchema> = Object.create(null);
  for (const type of Object.keys(content).sort()) {
    if (type !== "application/json" && !/^application\/[a-z0-9!#$&^_.+-]+\+json$/.test(type)) unsupported([...path, type], "Only concrete application/json or application/*+json media types are supported.");
    const value = asRecord(content[type], [...path, type]);
    keys(value, ["schema", "example", "examples"], [...path, type]);
    output[type] = reader.schema(value["schema"] === undefined ? {} : value["schema"], [...path, type, "schema"]);
  }
  return output;
}

function responseHeaders(reader: OpenApiReader, input: unknown, path: Path): { headers: ImportedSchema; transport: Readonly<Record<string, string>> } {
  const headers = input === undefined ? {} : asRecord(input, path);
  const shape: Shape = Object.create(null);
  const transport: Record<string, string> = Object.create(null);
  for (const key of Object.keys(headers).sort()) {
    const name = key.toLowerCase();
    if (name === "content-type") unsupported([...path, key], "Content-Type response header must be described through content.");
    if (Object.hasOwn(shape, name)) invalid([...path, key], "Duplicate response header name.");
    const resolved = reader.resolve(headers[key], [...path, key]);
    const entry = resolved.value, at = resolved.path;
    keys(entry, ["description", "required", "deprecated", "style", "explode", "schema", "example", "examples"], at);
    const schema = reader.schema(entry["schema"], [...at, "schema"]);
    shape[name] = flag(entry["required"], [...at, "required"]) ? schema : schema.optional();
    transport[name] = serialization(entry, at, "header");
  }
  return { headers: object(shape, { unknownProperties: "passthrough" }), transport };
}
