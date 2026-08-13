import { describeSchema, type Schema, type SchemaDefinition } from "@safe-shape/core";

export type JsonSchema = Readonly<Record<string, unknown>>;

export interface JsonSchemaOptions {
  readonly schema?: string;
}

export function toJsonSchema(schema: Schema<any>, options: JsonSchemaOptions = {}): JsonSchema {
  const jsonSchema = convertDefinition(describeSchema(schema));

  if (options.schema === undefined) {
    return jsonSchema;
  }

  return Object.freeze({
    $schema: options.schema,
    ...jsonSchema,
  });
}

function convertDefinition(definition: SchemaDefinition): JsonSchema {
  let jsonSchema: JsonSchema;

  switch (definition.kind) {
    case "string":
      jsonSchema = Object.freeze({ type: "string" });
      break;
    case "number":
      jsonSchema = Object.freeze({ type: "number" });
      break;
    case "boolean":
      jsonSchema = Object.freeze({ type: "boolean" });
      break;
    case "literal":
      jsonSchema = Object.freeze({ const: definition.value });
      break;
    case "array":
      jsonSchema = Object.freeze({
        type: "array",
        items: convertDefinition(definition.item),
      });
      break;
    case "tuple":
      jsonSchema = Object.freeze({
        type: "array",
        prefixItems: Object.freeze(definition.items.map(convertDefinition)),
        minItems: definition.items.length,
        maxItems: definition.items.length,
      });
      break;
    case "union":
      jsonSchema = Object.freeze({
        anyOf: Object.freeze(definition.choices.map(convertDefinition)),
      });
      break;
    case "object":
      jsonSchema = convertObjectDefinition(definition);
      break;
    case "record":
      jsonSchema = Object.freeze({
        type: "object",
        additionalProperties: convertDefinition(definition.value),
      });
      break;
    case "nullable":
      jsonSchema = Object.freeze({
        anyOf: Object.freeze([convertDefinition(definition.inner), Object.freeze({ type: "null" })]),
      });
      break;
    case "optional":
      jsonSchema = convertDefinition(definition.inner);
      break;
    case "transform":
      jsonSchema = convertDefinition(definition.inner);
      break;
  }

  return addMetadata(jsonSchema, definition.metadata);
}

function convertObjectDefinition(
  definition: Extract<SchemaDefinition, { readonly kind: "object" }>,
): JsonSchema {
  const properties: Record<string, JsonSchema> = {};

  for (const [key, propertyDefinition] of Object.entries(definition.shape)) {
    properties[key] = convertDefinition(propertyDefinition);
  }

  return Object.freeze({
    type: "object",
    properties: Object.freeze(properties),
    required: Object.freeze([...definition.required]),
    additionalProperties: false,
  });
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
