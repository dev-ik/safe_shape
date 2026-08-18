import {
  describeContract,
  type Schema,
  type SchemaDefinition,
  type StandardSchemaV1,
  type StringConstraints,
} from "@safe-shape/core";

export type JsonSchema = Readonly<Record<string, unknown>>;

export type JsonSchemaTarget = "draft-2020-12" | "draft-07";

export interface JsonSchemaOptions {
  readonly id?: string;
  readonly schema?: string;
  readonly side?: "input" | "output";
  readonly target?: JsonSchemaTarget;
}

export type JsonSchemaExportIssueCode =
  | "json_schema.contract.invalid"
  | "json_schema.dialect.conflict"
  | "json_schema.id.invalid"
  | "json_schema.output.opaque"
  | "json_schema.refinement.unrepresentable"
  | "json_schema.target.unsupported";

export interface JsonSchemaExportIssue {
  readonly code: JsonSchemaExportIssueCode;
  readonly severity: "warning" | "error";
  readonly message: string;
  readonly path: readonly (string | number)[];
  readonly side: "input" | "output";
  readonly target: JsonSchemaTarget;
  readonly details?: Readonly<Record<string, unknown>>;
}

export type JsonSchemaExportResult =
  | Readonly<{
      success: true;
      schema: JsonSchema;
      warnings: readonly JsonSchemaExportIssue[];
    }>
  | Readonly<{
      success: false;
      issues: readonly JsonSchemaExportIssue[];
    }>;

export class JsonSchemaExportError extends TypeError {
  readonly issues: readonly JsonSchemaExportIssue[];

  constructor(issues: readonly JsonSchemaExportIssue[]) {
    const frozenIssues = Object.freeze(issues.map(freezeExportIssue));
    super(frozenIssues.map((issue) => issue.message).join(" "));
    this.name = "JsonSchemaExportError";
    this.issues = frozenIssues;
  }
}

export interface StandardJSONSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": StandardJSONSchemaV1.Props<Input, Output>;
}

export declare namespace StandardJSONSchemaV1 {
  export interface Props<Input = unknown, Output = Input> {
    readonly version: 1;
    readonly vendor: string;
    readonly jsonSchema: Converter;
    readonly types?: Types<Input, Output> | undefined;
  }

  export interface Converter {
    readonly input: (options: Options) => Record<string, unknown>;
    readonly output: (options: Options) => Record<string, unknown>;
  }

  export type Target =
    | "draft-2020-12"
    | "draft-07"
    | "openapi-3.0"
    | ({} & string);

  export interface Options {
    readonly target: Target;
    readonly libraryOptions?: Record<string, unknown> | undefined;
  }

  export interface Types<Input = unknown, Output = Input> {
    readonly input: Input;
    readonly output: Output;
  }

  export type InferInput<Schema extends StandardJSONSchemaV1> = NonNullable<
    Schema["~standard"]["types"]
  >["input"];

  export type InferOutput<Schema extends StandardJSONSchemaV1> = NonNullable<
    Schema["~standard"]["types"]
  >["output"];
}

export interface StandardSchemaWithJSONSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": StandardSchemaV1.Props<Input, Output> &
    StandardJSONSchemaV1.Props<Input, Output>;
}

type ContractSide = NonNullable<JsonSchemaOptions["side"]>;
type ConversionContext = Readonly<{
  issues: JsonSchemaExportIssue[];
  side: ContractSide;
  target: JsonSchemaTarget;
}>;

const JSON_SCHEMA_URIS: Readonly<Record<JsonSchemaTarget, string>> = Object.freeze({
  "draft-2020-12": "https://json-schema.org/draft/2020-12/schema",
  "draft-07": "http://json-schema.org/draft-07/schema#",
});

const EMPTY_WARNINGS: readonly JsonSchemaExportIssue[] = Object.freeze([]);

export function toJsonSchema(schema: Schema<any, any>, options: JsonSchemaOptions = {}): JsonSchema {
  const result = safeToJsonSchema(schema, options);
  if (!result.success) {
    throw new JsonSchemaExportError(result.issues);
  }

  return result.schema;
}

export function safeToJsonSchema(
  schema: Schema<any, any>,
  options: JsonSchemaOptions = {},
): JsonSchemaExportResult {
  const side = options.side ?? "input";
  let target: JsonSchemaTarget = "draft-2020-12";

  try {
    target = resolveJsonSchemaTarget(options, side);
    const id = options.id === undefined
      ? undefined
      : validateJsonSchemaId(options.id, side, target);
    const description = describeContract(schema);
    const issues: JsonSchemaExportIssue[] = [];
    const context: ConversionContext = Object.freeze({ issues, side, target });
    const graph = description[side];
    const definitions: Record<string, JsonSchema> = {};
    const definitionsKeyword = target === "draft-07" ? "definitions" : "$defs";

    for (const [definitionId, definition] of Object.entries(graph.definitions)) {
      definitions[definitionId] = convertDefinition(
        definition,
        context,
        [definitionsKeyword, definitionId],
      );
    }

    const convertedRoot = convertDefinition(graph.root, context, []);
    if (issues.length > 0) {
      return exportFailure(issues);
    }

    const jsonSchema = Object.keys(definitions).length === 0
      ? convertedRoot
      : Object.freeze({
          ...convertedRoot,
          [definitionsKeyword]: Object.freeze(definitions),
        });

    const schemaUri = options.schema ?? (options.target === undefined
      ? undefined
      : JSON_SCHEMA_URIS[target]);
    const artifact = schemaUri === undefined && id === undefined
      ? jsonSchema
      : Object.freeze({
          ...(schemaUri === undefined ? {} : { $schema: schemaUri }),
          ...(id === undefined ? {} : { $id: id }),
          ...jsonSchema,
        });

    return Object.freeze({
      success: true,
      schema: artifact,
      warnings: EMPTY_WARNINGS,
    });
  } catch (error) {
    if (error instanceof JsonSchemaExportError) {
      return exportFailure(error.issues);
    }

    const message = error instanceof Error ? error.message : "Unknown Contract IR error.";
    return exportFailure([createExportIssue({
      code: "json_schema.contract.invalid",
      message,
      path: [],
      side,
      target,
    })]);
  }
}

export function createStandardJsonSchema<TOutput, TInput>(
  schema: Schema<TOutput, TInput>,
): StandardSchemaWithJSONSchemaV1<TInput, TOutput> {
  const jsonSchema = Object.freeze({
    input: (options: StandardJSONSchemaV1.Options) =>
      toStandardJsonSchema(schema, "input", options),
    output: (options: StandardJSONSchemaV1.Options) =>
      toStandardJsonSchema(schema, "output", options),
  });

  return Object.freeze({
    "~standard": Object.freeze({
      ...schema["~standard"],
      jsonSchema,
    }),
  });
}

function toStandardJsonSchema(
  schema: Schema<any, any>,
  side: ContractSide,
  options: StandardJSONSchemaV1.Options,
): JsonSchema {
  if (!isJsonSchemaTarget(options?.target)) {
    throw new JsonSchemaExportError([createExportIssue({
      code: "json_schema.target.unsupported",
      message: `Unsupported Standard JSON Schema target ${JSON.stringify(options?.target)}.`,
      path: [],
      side,
      target: "draft-2020-12",
      details: { requested_target: options?.target },
    })]);
  }

  const id = standardJsonSchemaId(options.libraryOptions, side, options.target);
  return toJsonSchema(schema, {
    ...(id === undefined ? {} : { id }),
    side,
    target: options.target,
  });
}

function standardJsonSchemaId(
  libraryOptions: Readonly<Record<string, unknown>> | undefined,
  side: ContractSide,
  target: JsonSchemaTarget,
): string | undefined {
  const id = libraryOptions?.id;
  if (id === undefined) {
    return undefined;
  }
  if (typeof id !== "string") {
    throw new JsonSchemaExportError([createExportIssue({
      code: "json_schema.id.invalid",
      message: "Standard JSON Schema libraryOptions.id must be a string.",
      path: [],
      side,
      target,
    })]);
  }

  return id;
}

function isJsonSchemaTarget(
  target: StandardJSONSchemaV1.Target | undefined,
): target is JsonSchemaTarget {
  return target === "draft-2020-12" || target === "draft-07";
}

function resolveJsonSchemaTarget(
  options: JsonSchemaOptions,
  side: ContractSide,
): JsonSchemaTarget {
  if (options.target !== undefined && !isJsonSchemaTarget(options.target)) {
    throw new JsonSchemaExportError([createExportIssue({
      code: "json_schema.target.unsupported",
      message: `Unsupported JSON Schema target ${JSON.stringify(options.target)}.`,
      path: [],
      side,
      target: "draft-2020-12",
      details: { requested_target: options.target },
    })]);
  }

  const schemaTarget = targetForKnownSchemaUri(options.schema);
  if (options.target !== undefined && schemaTarget !== undefined && options.target !== schemaTarget) {
    throw new JsonSchemaExportError([createExportIssue({
      code: "json_schema.dialect.conflict",
      message: `JSON Schema target ${JSON.stringify(options.target)} conflicts with $schema ${JSON.stringify(options.schema)}.`,
      path: [],
      side,
      target: options.target,
      details: { schema: options.schema },
    })]);
  }

  return options.target ?? schemaTarget ?? "draft-2020-12";
}

function targetForKnownSchemaUri(schemaUri: string | undefined): JsonSchemaTarget | undefined {
  if (schemaUri === undefined) {
    return undefined;
  }

  const normalized = schemaUri.replace(/^http:/, "https:").replace(/#$/, "");
  if (normalized === "https://json-schema.org/draft-07/schema") {
    return "draft-07";
  }
  if (normalized === "https://json-schema.org/draft/2020-12/schema") {
    return "draft-2020-12";
  }

  return undefined;
}

function validateJsonSchemaId(
  id: string,
  side: ContractSide,
  target: JsonSchemaTarget,
): string {
  if (id.length === 0) {
    throw invalidJsonSchemaId("JSON Schema $id must not be empty.", id, side, target);
  }
  if (/\s/u.test(id)) {
    throw invalidJsonSchemaId(
      "JSON Schema $id must not contain whitespace.",
      id,
      side,
      target,
    );
  }
  if (id.includes("#")) {
    throw invalidJsonSchemaId(
      "JSON Schema $id must not contain a fragment.",
      id,
      side,
      target,
    );
  }

  try {
    new URL(id);
  } catch {
    throw invalidJsonSchemaId(
      "JSON Schema $id must be an absolute URI.",
      id,
      side,
      target,
    );
  }

  return id;
}

function invalidJsonSchemaId(
  message: string,
  id: string,
  side: ContractSide,
  target: JsonSchemaTarget,
): JsonSchemaExportError {
  return new JsonSchemaExportError([createExportIssue({
    code: "json_schema.id.invalid",
    message,
    path: [],
    side,
    target,
    details: { id },
  })]);
}

function createExportIssue(
  issue: Omit<JsonSchemaExportIssue, "severity" | "path" | "details"> & {
    readonly path: readonly (string | number)[];
    readonly details?: Readonly<Record<string, unknown>>;
  },
): JsonSchemaExportIssue {
  return freezeExportIssue({
    ...issue,
    severity: "error" as const,
  });
}

function freezeExportIssue(issue: JsonSchemaExportIssue): JsonSchemaExportIssue {
  return Object.freeze({
    ...issue,
    path: Object.freeze([...issue.path]),
    ...(issue.details === undefined
      ? {}
      : { details: Object.freeze({ ...issue.details }) }),
  });
}

function exportFailure(
  issues: readonly JsonSchemaExportIssue[],
): JsonSchemaExportResult {
  return Object.freeze({
    success: false,
    issues: Object.freeze([...issues]),
  });
}

function convertDefinition(
  definition: SchemaDefinition,
  context: ConversionContext,
  path: readonly (string | number)[],
): JsonSchema {
  let jsonSchema: JsonSchema;

  for (const refinementId of definition.refinements ?? []) {
    context.issues.push(createExportIssue({
      code: "json_schema.refinement.unrepresentable",
      message: refinementId === null
        ? "Anonymous refinement cannot be represented in JSON Schema."
        : `Refinement ${JSON.stringify(refinementId)} cannot be represented in JSON Schema.`,
      path,
      side: context.side,
      target: context.target,
      details: { refinement_id: refinementId },
    }));
  }

  switch (definition.kind) {
    case "string":
      jsonSchema = convertStringConstraints(definition.constraints);
      break;
    case "number":
      jsonSchema = Object.freeze({
        type: definition.constraints?.integer === true ? "integer" : "number",
        ...(definition.constraints?.minimum === undefined
          ? {}
          : { minimum: definition.constraints.minimum }),
        ...(definition.constraints?.maximum === undefined
          ? {}
          : { maximum: definition.constraints.maximum }),
        ...(definition.constraints?.multipleOf === undefined
          ? {}
          : { multipleOf: definition.constraints.multipleOf }),
      });
      break;
    case "boolean":
      jsonSchema = Object.freeze({ type: "boolean" });
      break;
    case "literal":
      jsonSchema = Object.freeze({ const: definition.value });
      break;
    case "enum":
      jsonSchema = Object.freeze({ enum: Object.freeze([...definition.values]) });
      break;
    case "unknown":
      jsonSchema = Object.freeze({});
      break;
    case "never":
      jsonSchema = Object.freeze({ not: Object.freeze({}) });
      break;
    case "array":
      jsonSchema = Object.freeze({
        type: "array",
        items: convertDefinition(definition.item, context, childPath(path, "items")),
        ...(definition.constraints?.minLength === undefined
          ? {}
          : { minItems: definition.constraints.minLength }),
        ...(definition.constraints?.maxLength === undefined
          ? {}
          : { maxItems: definition.constraints.maxLength }),
      });
      break;
    case "tuple":
      jsonSchema = convertTupleDefinition(definition, context, path);
      break;
    case "union":
      jsonSchema = Object.freeze({
        anyOf: Object.freeze(
          definition.choices.map((choice, index) =>
            convertDefinition(choice, context, childPath(path, "anyOf", index))),
        ),
      });
      break;
    case "discriminatedUnion":
      jsonSchema = Object.freeze({
        oneOf: Object.freeze(
          definition.choices.map((choice, index) =>
            convertDefinition(choice, context, childPath(path, "oneOf", index))),
        ),
      });
      break;
    case "intersection":
      jsonSchema = Object.freeze({
        allOf: Object.freeze([
          convertDefinition(definition.left, context, childPath(path, "allOf", 0)),
          convertDefinition(definition.right, context, childPath(path, "allOf", 1)),
        ]),
      });
      break;
    case "object":
      jsonSchema = convertObjectDefinition(definition, context, path);
      break;
    case "record":
      jsonSchema = Object.freeze({
        type: "object",
        additionalProperties: convertDefinition(
          definition.value,
          context,
          childPath(path, "additionalProperties"),
        ),
        ...(definition.key === undefined
          ? {}
          : { propertyNames: convertStringConstraints(definition.key) }),
      });
      break;
    case "nullable":
      jsonSchema = Object.freeze({
        anyOf: Object.freeze([
          convertDefinition(definition.inner, context, childPath(path, "anyOf", 0)),
          Object.freeze({ type: "null" }),
        ]),
      });
      break;
    case "optional":
      jsonSchema = convertDefinition(definition.inner, context, path);
      break;
    case "transform":
      jsonSchema = convertDefinition(definition.inner, context, path);
      break;
    case "reference":
      jsonSchema = Object.freeze({
        $ref: `#/${context.target === "draft-07" ? "definitions" : "$defs"}/${escapeJsonPointerSegment(definition.id)}`,
      });
      break;
    case "opaque":
      context.issues.push(createExportIssue({
        code: "json_schema.output.opaque",
        message: `Cannot export opaque ${definition.behavior} output to JSON Schema.`,
        path,
        side: context.side,
        target: context.target,
        details: {
          behavior: definition.behavior,
          ...(definition.id === undefined ? {} : { id: definition.id }),
        },
      }));
      jsonSchema = Object.freeze({});
      break;
  }

  return addMetadata(jsonSchema, definition.metadata);
}

function convertTupleDefinition(
  definition: Extract<SchemaDefinition, { readonly kind: "tuple" }>,
  context: ConversionContext,
  path: readonly (string | number)[],
): JsonSchema {
  const itemsKeyword = context.target === "draft-07" ? "items" : "prefixItems";
  const items = Object.freeze(
    definition.items.map((item, index) =>
      convertDefinition(item, context, childPath(path, itemsKeyword, index))),
  );

  if (context.target === "draft-07") {
    return Object.freeze({
      type: "array",
      items,
      additionalItems: false,
      minItems: definition.items.length,
      maxItems: definition.items.length,
    });
  }

  return Object.freeze({
    type: "array",
    prefixItems: items,
    minItems: definition.items.length,
    maxItems: definition.items.length,
  });
}

const STRING_FORMAT_PATTERNS = Object.freeze({
  email: "^(?=.{3,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$",
  uuid: "^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$",
  date: "^(\\d{4})-(\\d{2})-(\\d{2})$",
  "date-time": "^(\\d{4})-(\\d{2})-(\\d{2})[Tt](\\d{2}):(\\d{2}):(\\d{2})(?:\\.\\d+)?(?:[Zz]|[+-]\\d{2}:\\d{2})$",
});

function convertStringConstraints(constraints: StringConstraints | undefined): JsonSchema {
  return Object.freeze({
    type: "string",
    ...(constraints?.minLength === undefined ? {} : { minLength: constraints.minLength }),
    ...(constraints?.maxLength === undefined ? {} : { maxLength: constraints.maxLength }),
    ...stringPatternAndFormatKeywords(constraints),
  });
}

function stringPatternAndFormatKeywords(
  constraints: Extract<SchemaDefinition, { readonly kind: "string" }>["constraints"],
): Readonly<Record<string, unknown>> {
  const pattern = constraints?.pattern;
  const format = constraints?.format;
  if (format === undefined) {
    return pattern === undefined ? {} : { pattern };
  }

  return {
    format,
    pattern: STRING_FORMAT_PATTERNS[format],
    ...(pattern === undefined
      ? {}
      : { allOf: Object.freeze([Object.freeze({ pattern })]) }),
  };
}

function escapeJsonPointerSegment(value: string): string {
  return value.replaceAll("~", "~0").replaceAll("/", "~1");
}

function convertObjectDefinition(
  definition: Extract<SchemaDefinition, { readonly kind: "object" }>,
  context: ConversionContext,
  path: readonly (string | number)[],
): JsonSchema {
  const properties: Record<string, JsonSchema> = {};

  for (const [key, propertyDefinition] of Object.entries(definition.shape)) {
    properties[key] = convertDefinition(
      propertyDefinition,
      context,
      childPath(path, "properties", key),
    );
  }

  return Object.freeze({
    type: "object",
    properties: Object.freeze(properties),
    required: Object.freeze([...definition.required]),
    additionalProperties: definition.unknownProperties === "passthrough" ||
      (definition.unknownProperties === "strip" && context.side === "input"),
  });
}

function childPath(
  path: readonly (string | number)[],
  ...segments: readonly (string | number)[]
): readonly (string | number)[] {
  return [...path, ...segments];
}

function addMetadata(schema: JsonSchema, metadata: SchemaDefinition["metadata"]): JsonSchema {
  if (metadata === undefined) {
    return schema;
  }

  return Object.freeze({
    ...schema,
    ...(metadata.title === undefined ? {} : { title: metadata.title }),
    ...(metadata.description === undefined ? {} : { description: metadata.description }),
    ...(metadata.examples === undefined ? {} : { examples: Object.freeze([...metadata.examples]) }),
  });
}
