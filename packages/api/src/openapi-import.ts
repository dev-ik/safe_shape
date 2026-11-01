import { parseDocument } from "yaml";
import {
  array, boolean, enum as enumSchema, intersection, lazy, literal, never,
  number, object, record, string, union, unknown,
  type Schema, type Shape, type StringFormat,
} from "@safe-shape/core";

export type Path = readonly (string | number)[];
type Data = Record<string, unknown>;
export type ImportedSchema = Schema<unknown>;
export type FormatPolicy = "reject" | "annotation" | "safe-shape";
export class ImportFailure extends Error {
  constructor(readonly code: "openapi.document.invalid" | "openapi.feature.unsupported", readonly path: Path, message: string) {
    super(message);
  }
}
export function invalid(path: Path, message: string): never {
  throw new ImportFailure("openapi.document.invalid", path, message);
}
export function unsupported(path: Path, message: string): never {
  throw new ImportFailure("openapi.feature.unsupported", path, message);
}
export function asRecord(value: unknown, path: Path): Data {
  if (value === null || typeof value !== "object" || Array.isArray(value)) invalid(path, "Expected an object.");
  return value as Data;
}
export function asString(value: unknown, path: Path): string {
  if (typeof value !== "string" || !value.length) invalid(path, "Expected a non-empty string.");
  return value;
}
export function flag(value: unknown, path: Path, fallback = false): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== "boolean") invalid(path, "Expected a boolean.");
  return value;
}
export function keys(value: Data, allowed: readonly string[], path: Path): void {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key) && !key.startsWith("x-")) unsupported([...path, key], `Unsupported keyword: ${key}.`);
  }
}

// Copy without invoking user accessors, accepting only the JSON data model.
function copyData(input: unknown): unknown {
  let count = 0;
  const active = new Set<object>();
  function visit(value: unknown, path: Path): unknown {
    if (++count > 100_000 || path.length > 128) invalid(path, "Document exceeds the import size or depth limit.");
    if (value === null || typeof value === "string" || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return Object.is(value, -0) ? 0 : value;
    if (typeof value !== "object" || value === null) invalid(path, "Expected JSON-compatible data.");
    if (active.has(value)) invalid(path, "Cyclic document data is unsupported; use $ref.");
    if (!Array.isArray(value) && ![Object.prototype, null].includes(Object.getPrototypeOf(value))) invalid(path, "Expected a plain JSON object.");
    active.add(value);
    const result: Data | unknown[] = Array.isArray(value) ? [] : Object.create(null) as Data;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (Object.getOwnPropertySymbols(value).length) invalid(path, "Symbol properties are not JSON data.");
    if (Array.isArray(value) && Object.keys(value).length !== value.length) invalid(path, "Expected a dense JSON array.");
    for (const key of Object.keys(descriptors).sort()) {
      if (Array.isArray(value) && key === "length") continue;
      const descriptor = descriptors[key]!;
      if (!descriptor.enumerable || !("value" in descriptor)) invalid([...path, key], "Expected enumerable data properties.");
      if (Array.isArray(result)) {
        if (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key) >= (value as unknown[]).length) invalid([...path, key], "Unexpected array property.");
        result[Number(key)] = visit(descriptor.value, [...path, Number(key)]);
      } else result[key] = visit(descriptor.value, [...path, key]);
    }
    active.delete(value);
    return result;
  }
  return visit(input, []);
}

export function readDocument(input: unknown): Data {
  if (typeof input === "string") {
    if (input.length > 5_000_000) invalid([], "Document text exceeds the import limit.");
    try {
      const doc = parseDocument(input, { version: "1.2", uniqueKeys: true, stringKeys: true, prettyErrors: false });
      if (doc.errors.length || doc.warnings.length || doc.directives?.yaml.version !== "1.2") invalid([], "Expected one valid YAML 1.2 or JSON document without duplicate keys or custom tags.");
      input = doc.toJS({ maxAliasCount: 100 });
    } catch (error) {
      if (error instanceof ImportFailure) throw error;
      invalid([], "Unable to parse YAML/JSON document.");
    }
  }
  const doc = asRecord(copyData(input), []);
  if (typeof doc["openapi"] !== "string" || !/^3\.[01]\.\d+$/.test(doc["openapi"])) unsupported(["openapi"], "Only OpenAPI 3.0.x and 3.1.x are supported.");
  const info = asRecord(doc["info"], ["info"]);
  asString(info["title"], ["info", "title"]);
  asString(info["version"], ["info", "version"]);
  if (doc["jsonSchemaDialect"] !== undefined && !["https://spec.openapis.org/oas/3.1/dialect/base", "https://json-schema.org/draft/2020-12/schema"].includes(String(doc["jsonSchemaDialect"]))) unsupported(["jsonSchemaDialect"], "Unsupported JSON Schema dialect.");
  keys(doc, ["openapi", "info", "servers", "paths", "components", "security", "tags", "externalDocs", "jsonSchemaDialect"], []);
  asRecord(doc["paths"], ["paths"]);
  return doc;
}

const ANNOTATIONS = ["title", "description", "default", "example", "examples", "deprecated", "externalDocs", "$comment"];
const SCHEMA_KEYS = [...ANNOTATIONS, "$ref", "$schema", "$defs", "type", "enum", "const", "nullable", "properties", "required", "additionalProperties", "items", "minItems", "maxItems", "minLength", "maxLength", "pattern", "format", "minimum", "maximum", "multipleOf", "anyOf", "allOf", "readOnly", "writeOnly"];
const STRING_KEYS = ["minLength", "maxLength", "pattern", "format"];
const NUMBER_KEYS = ["minimum", "maximum", "multipleOf"];
const ARRAY_KEYS = ["items", "minItems", "maxItems"];
const OBJECT_KEYS = ["properties", "required", "additionalProperties"];

export class OpenApiReader {
  readonly version30: boolean;
  private readonly references = new Map<string, { schema: ImportedSchema; target?: ImportedSchema; depth: number }>();
  private schemaCount = 0;
  constructor(readonly document: Data, private readonly formatPolicy: FormatPolicy) {
    this.version30 = String(document["openapi"]).startsWith("3.0.");
  }

  pointer(ref: unknown, path: Path): { value: unknown; path: Path; id: string } {
    const text = asString(ref, path);
    if (!text.startsWith("#/")) unsupported(path, "Only document-local JSON Pointer references are supported.");
    let tokens: string[];
    try {
      const decoded = decodeURIComponent(text.slice(1));
      tokens = decoded.slice(1).split("/").map((token) => {
        if (/~(?![01])/u.test(token)) throw new Error();
        return token.replaceAll("~1", "/").replaceAll("~0", "~");
      });
    } catch { invalid(path, "Invalid JSON Pointer reference."); }
    let value: unknown = this.document;
    for (const token of tokens) {
      if (value === null || typeof value !== "object" || !Object.hasOwn(value, token)) invalid(path, "Unresolved local reference.");
      value = (value as Data)[token];
    }
    return { value, path: tokens, id: "#/" + tokens.map((token) => token.replaceAll("~", "~0").replaceAll("/", "~1")).join("/") };
  }

  resolve(value: unknown, path: Path): { value: Data; path: Path } {
    const seen = new Set<string>();
    let entry = asRecord(value, path);
    while (Object.hasOwn(entry, "$ref")) {
      keys(entry, ["$ref", "summary", "description"], path);
      const target = this.pointer(entry["$ref"], [...path, "$ref"]);
      if (seen.has(target.id)) invalid(path, "Cyclic non-schema reference.");
      seen.add(target.id);
      entry = asRecord(target.value, target.path);
      path = target.path;
    }
    return { value: entry, path };
  }

  schema(value: unknown, path: Path, depth = 0, nesting = 0): ImportedSchema {
    if (++this.schemaCount > 20_000 || nesting > 128) unsupported(path, "Schema expansion exceeds the import limit.");
    try { return this.convert(value, path, depth, nesting); }
    catch (error) {
      if (error instanceof ImportFailure) throw error;
      invalid(path, error instanceof Error ? error.message : "Invalid schema constraint.");
    }
  }

  private convert(value: unknown, path: Path, depth: number, nesting: number): ImportedSchema {
    if (typeof value === "boolean") {
      if (this.version30) invalid(path, "Boolean schemas require OpenAPI 3.1.");
      return value ? unknown() : never();
    }
    const node = asRecord(value, path);
    keys(node, SCHEMA_KEYS, path);
    if (node["$schema"] !== undefined && (this.version30 || !["https://json-schema.org/draft/2020-12/schema", "https://spec.openapis.org/oas/3.1/dialect/base"].includes(String(node["$schema"])))) unsupported([...path, "$schema"], "Unsupported schema dialect.");
    for (const key of ["readOnly", "writeOnly"] as const) {
      if (flag(node[key], [...path, key])) unsupported([...path, key], "Directional readOnly/writeOnly projection is not supported.");
    }
    if (node["nullable"] !== undefined && !this.version30) unsupported([...path, "nullable"], "OpenAPI 3.1 uses a null type instead of nullable.");
    if (this.version30 && (node["const"] !== undefined || node["$defs"] !== undefined)) unsupported(path, "const and $defs require OpenAPI 3.1.");
    const nullable = flag(node["nullable"], [...path, "nullable"]);
    let base: ImportedSchema = unknown();
    if (Object.hasOwn(node, "$ref")) {
      if (this.version30 && Object.keys(node).some((key) => key !== "$ref" && !ANNOTATIONS.includes(key) && !key.startsWith("x-"))) unsupported(path, "OpenAPI 3.0 $ref siblings cannot add constraints.");
      const target = this.pointer(node["$ref"], [...path, "$ref"]);
      let entry = this.references.get(target.id);
      if (entry) {
        if (!entry.target && depth <= entry.depth) unsupported(path, "Unproductive schema reference cycle.");
      } else {
        const pending: { schema: ImportedSchema; target?: ImportedSchema; depth: number } = {
          schema: lazy(() => pending.target!, { id: target.id }), depth,
        };
        this.references.set(target.id, pending);
        pending.target = this.schema(target.value, target.path, depth, nesting + 1);
        entry = pending;
      }
      base = entry.schema;
      if (this.version30) return base;
    }

    const rawTypes = node["type"];
    if (rawTypes !== undefined) {
      if (this.version30 && Array.isArray(rawTypes)) invalid([...path, "type"], "OpenAPI 3.0 type must be a string.");
      const types = Array.isArray(rawTypes) ? rawTypes : [rawTypes];
      if (!types.length || new Set(types).size !== types.length || types.some((type) => !["string", "number", "integer", "boolean", "null", "object", "array"].includes(String(type)) || typeof type !== "string")) invalid([...path, "type"], "Invalid schema type.");
      if (this.version30 && types.includes("null")) invalid([...path, "type"], "OpenAPI 3.0 uses nullable instead of a null type.");
      let typed = this.choices(types.map((type) => this.typed(String(type), node, path, depth, nesting)));
      if (nullable) typed = typed.nullable();
      base = this.and(base, typed);
    } else if ([...STRING_KEYS, ...NUMBER_KEYS, ...ARRAY_KEYS, ...OBJECT_KEYS].some((key) => Object.hasOwn(node, key))) {
      unsupported(path, "Type-specific constraints without an explicit type are not supported.");
    }
    for (const key of ["anyOf", "allOf"] as const) {
      if (!Object.hasOwn(node, key)) continue;
      const children = node[key];
      if (!Array.isArray(children) || !children.length) invalid([...path, key], "Expected a non-empty schema array.");
      const schemas = children.map((child, index) => this.schema(child, [...path, key, index], depth, nesting + 1));
      base = this.and(base, key === "anyOf" ? this.choices(schemas) : schemas.reduce((a, b) => this.and(a, b)));
    }
    if (Object.hasOwn(node, "enum") || Object.hasOwn(node, "const")) {
      let values: unknown[] = Object.hasOwn(node, "enum") ? node["enum"] as unknown[] : [node["const"]];
      if (!Array.isArray(values) || !values.length) invalid([...path, "enum"], "Expected a non-empty enum.");
      if (values.some((item) => item !== null && !["string", "number", "boolean"].includes(typeof item))) unsupported(path, "Only scalar enum/const values are supported.");
      if (Object.hasOwn(node, "enum") && Object.hasOwn(node, "const")) values = values.filter((item) => item === node["const"]);
      values = [...new Set(values)].filter((item) => base.safeParse(item).success);
      base = values.length && values.every((item) => typeof item === "string" || typeof item === "number")
        ? enumSchema(values as [string | number, ...(string | number)[]])
        : this.choices(values.map((item) => literal(item as string | number | boolean | null)));
    }
    const title = node["title"];
    const description = node["description"];
    if (title !== undefined && typeof title !== "string") invalid([...path, "title"], "Expected a string.");
    if (description !== undefined && typeof description !== "string") invalid([...path, "description"], "Expected a string.");
    return title !== undefined || description !== undefined ? base.annotate({ ...(title === undefined ? {} : { title }), ...(description === undefined ? {} : { description }) }) : base;
  }

  private typed(type: string, node: Data, path: Path, depth: number, nesting: number): ImportedSchema {
    const getNumber = (key: string, integer = false): number | undefined => {
      const value = node[key];
      if (value === undefined) return undefined;
      if (typeof value !== "number" || !Number.isFinite(value) || (integer && (!Number.isSafeInteger(value) || value < 0))) invalid([...path, key], "Invalid numeric constraint.");
      return value;
    };
    const numbers = (names: readonly string[], integer = false) => Object.fromEntries(names.filter((key) => node[key] !== undefined).map((key) => [key, getNumber(key, integer)]));
    if (type === "string") {
      const pattern = node["pattern"];
      if (pattern !== undefined && typeof pattern !== "string") invalid([...path, "pattern"], "Expected an ECMAScript pattern string.");
      let format: StringFormat | undefined;
      if (node["format"] !== undefined) {
        asString(node["format"], [...path, "format"]);
        if (this.formatPolicy === "reject") unsupported([...path, "format"], "Choose formatPolicy explicitly to interpret OpenAPI formats.");
        if (this.formatPolicy === "safe-shape") {
          if (!["email", "uuid", "date", "date-time"].includes(String(node["format"]))) unsupported([...path, "format"], "Unsupported SafeShape string format.");
          format = node["format"] as StringFormat;
        }
      }
      return string({ ...numbers(["minLength", "maxLength"], true), ...(pattern === undefined ? {} : { pattern }), ...(format === undefined ? {} : { format }) });
    }
    if (node["format"] !== undefined && this.formatPolicy !== "annotation") unsupported([...path, "format"], "Non-string formats require formatPolicy: annotation.");
    if (type === "number" || type === "integer") return number({ ...numbers(NUMBER_KEYS), ...(type === "integer" ? { integer: true } : {}) });
    if (type === "boolean") return boolean();
    if (type === "null") return literal(null);
    if (type === "array") {
      if (this.version30 && node["items"] === undefined) invalid([...path, "items"], "OpenAPI 3.0 arrays require items.");
      const item = node["items"] === undefined ? unknown() : this.schema(node["items"], [...path, "items"], depth + 1, nesting + 1);
      const minLength = getNumber("minItems", true), maxLength = getNumber("maxItems", true);
      return array(item, { ...(minLength === undefined ? {} : { minLength }), ...(maxLength === undefined ? {} : { maxLength }) });
    }
    const properties = node["properties"] === undefined ? {} : asRecord(node["properties"], [...path, "properties"]);
    const required = node["required"] === undefined ? [] : node["required"];
    if (!Array.isArray(required) || required.some((key) => typeof key !== "string") || new Set(required).size !== required.length) invalid([...path, "required"], "Expected unique required property names.");
    const additional = node["additionalProperties"] === undefined ? true : node["additionalProperties"];
    if (typeof additional !== "boolean") {
      if (Object.keys(properties).length || required.length) unsupported([...path, "additionalProperties"], "Typed additionalProperties with named fields is unsupported.");
      return record(this.schema(additional, [...path, "additionalProperties"], depth + 1, nesting + 1));
    }
    const shape: Shape = Object.create(null);
    for (const key of [...new Set([...Object.keys(properties), ...required as string[]])].sort()) {
      const field = Object.hasOwn(properties, key) ? this.schema(properties[key], [...path, "properties", key], depth + 1, nesting + 1) : additional ? unknown() : never();
      shape[key] = required.includes(key) ? field : field.optional();
    }
    return object(shape, { unknownProperties: additional ? "passthrough" : "reject" });
  }

  private choices(schemas: ImportedSchema[]): ImportedSchema {
    return schemas.length === 0 ? never() : schemas.length === 1 ? schemas[0]! : union(schemas as [ImportedSchema, ...ImportedSchema[]]);
  }
  private and(left: ImportedSchema, right: ImportedSchema): ImportedSchema {
    return left.kind === "unknown" ? right : right.kind === "unknown" ? left : intersection(left, right);
  }
}
