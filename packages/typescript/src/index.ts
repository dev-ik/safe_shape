import { describeSchema, type Schema, type SchemaDefinition } from "@safe-shape/core";

export interface TypeScriptTypeOptions {
  readonly name?: string;
}

export function toTypeScriptType(
  schema: Schema<any, any>,
  options: TypeScriptTypeOptions = {},
): string {
  const typeName = options.name ?? "SchemaOutput";

  if (!isValidTypeName(typeName)) {
    throw new TypeError(`Invalid TypeScript type name: ${typeName}`);
  }

  return `export type ${typeName} = ${definitionToTypeScript(describeSchema(schema), 0)};\n`;
}

function definitionToTypeScript(definition: SchemaDefinition, indent: number): string {
  switch (definition.kind) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "literal":
      return literalToTypeScript(definition.value);
    case "enum":
      return definition.values.map(literalToTypeScript).join(" | ");
    case "unknown":
      return "unknown";
    case "never":
      return "never";
    case "array":
      return `ReadonlyArray<${definitionToTypeScript(definition.item, indent)}>`;
    case "tuple":
      return `readonly [${definition.items.map((item) => definitionToTypeScript(item, indent)).join(", ")}]`;
    case "union":
      return definition.choices.map((choice) => definitionToTypeScript(choice, indent)).join(" | ");
    case "discriminatedUnion":
      return definition.choices.map((choice) => definitionToTypeScript(choice, indent)).join(" | ");
    case "intersection":
      return `(${definitionToTypeScript(definition.left, indent)}) & (${definitionToTypeScript(definition.right, indent)})`;
    case "object":
      return objectToTypeScript(definition, indent);
    case "record":
      return `Readonly<Record<string, ${definitionToTypeScript(definition.value, indent)}>>`;
    case "nullable":
      return `${definitionToTypeScript(definition.inner, indent)} | null`;
    case "optional":
      return `${definitionToTypeScript(definition.inner, indent)} | undefined`;
    case "transform":
      return "unknown";
    case "reference":
      throw new TypeError(
        "TypeScript generation does not support schema references yet.",
      );
    case "opaque":
      return "unknown";
  }
}

function objectToTypeScript(
  definition: Extract<SchemaDefinition, { readonly kind: "object" }>,
  indent: number,
): string {
  const entries = Object.entries(definition.shape);

  if (entries.length === 0 && definition.unknownProperties !== "passthrough") {
    return "{}";
  }

  const currentIndent = " ".repeat(indent);
  const propertyIndent = " ".repeat(indent + 2);
  const required = new Set(definition.required);
  const lines = entries.map(([key, propertyDefinition]) => {
    const optional = !required.has(key);
    const valueDefinition = optional && propertyDefinition.kind === "optional"
      ? propertyDefinition.inner
      : propertyDefinition;
    return `${propertyIndent}${formatPropertyKey(key)}${optional ? "?" : ""}: ${definitionToTypeScript(valueDefinition, indent + 2)};`;
  });
  if (definition.unknownProperties === "passthrough") {
    lines.push(`${propertyIndent}readonly [key: string]: unknown;`);
  }

  return `{\n${lines.join("\n")}\n${currentIndent}}`;
}

function literalToTypeScript(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  return JSON.stringify(value);
}

function formatPropertyKey(key: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(key) ? key : JSON.stringify(key);
}

function isValidTypeName(name: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(name);
}
