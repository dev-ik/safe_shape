import { describeContract, describeSchema, type Schema, type SchemaDefinition } from "@safe-shape/core";

export interface TypeScriptTypeOptions {
  readonly name?: string;
  readonly side?: "input" | "output";
}

export function toTypeScriptType(
  schema: Schema<any, any>,
  options: TypeScriptTypeOptions = {},
): string {
  const typeName = options.name ?? "SchemaOutput";

  if (!isValidTypeName(typeName)) {
    throw new TypeError(`Invalid TypeScript type name: ${typeName}`);
  }

  const side = options.side ?? "output";
  if (side !== "input" && side !== "output") throw new TypeError("TypeScript side must be input or output.");
  const graph = describeContract(schema)[side];
  const legacy = describeSchema(schema);
  const names = new Map<string, string>();
  const used = new Set([typeName, "ReadonlyArray", "Readonly", "Record"]);
  for (const id of Object.keys(graph.definitions).sort()) {
    let base = id.replace(/[^A-Za-z0-9_$]/g, "_");
    if (!isValidTypeName(base)) base = `Contract_${base}`;
    let candidate = base;
    for (let suffix = 2; used.has(candidate); suffix++) candidate = `${base}_${suffix}`;
    names.set(id, candidate);
    used.add(candidate);
  }

  function ensureProductive(node: SchemaDefinition, active = new Set<string>()): void {
    if (node.kind === "reference") {
      if (active.has(node.id)) throw new TypeError(`Unproductive recursive type alias: ${node.id}`);
      const definition = graph.definitions[node.id];
      if (!definition) throw new TypeError(`Missing schema reference: ${node.id}`);
      ensureProductive(definition, new Set([...active, node.id]));
    } else if (node.kind === "nullable" || node.kind === "optional") ensureProductive(node.inner, active);
    else if (node.kind === "union" || node.kind === "discriminatedUnion") node.choices.forEach((child) => ensureProductive(child, active));
    else if (node.kind === "intersection") { ensureProductive(node.left, active); ensureProductive(node.right, active); }
    else if (node.kind === "transform" && side === "input") ensureProductive(node.inner, active);
  }
  ensureProductive(graph.root);
  Object.values(graph.definitions).forEach((definition) => ensureProductive(definition));

  function render(node: SchemaDefinition, indent: number, original?: SchemaDefinition): string {
    const child = (value: SchemaDefinition, prior?: SchemaDefinition) => render(value, indent, prior);
    switch (node.kind) {
      case "string": return "string";
      case "number": return "number";
      case "boolean": return "boolean";
      case "literal": return literalToTypeScript(node.value);
      case "enum": return (original?.kind === "enum" ? original.values : node.values).map(literalToTypeScript).join(" | ");
      case "unknown": case "opaque": return "unknown";
      case "never": return "never";
      case "reference": {
        const name = names.get(node.id);
        if (!name) throw new TypeError(`Missing schema reference: ${node.id}`);
        return name;
      }
      case "array": {
        const item = child(node.item, original?.kind === "array" ? original.item : undefined);
        return typeName === "ReadonlyArray" ? `readonly (${item})[]` : `ReadonlyArray<${item}>`;
      }
      case "tuple": return `readonly [${node.items.map((item, i) => child(item, original?.kind === "tuple" ? original.items[i] : undefined)).join(", ")}]`;
      case "union": case "discriminatedUnion": return node.choices.map((choice, i) => child(choice, original?.kind === node.kind ? original.choices[i] : undefined)).join(" | ");
      case "intersection": return `(${child(node.left, original?.kind === "intersection" ? original.left : undefined)}) & (${child(node.right, original?.kind === "intersection" ? original.right : undefined)})`;
      case "record": {
        const value = child(node.value, original?.kind === "record" ? original.value : undefined);
        return names.size || typeName === "Readonly" || typeName === "Record"
          ? `{ readonly [key: string]: ${value} }` : `Readonly<Record<string, ${value}>>`;
      }
      case "nullable": case "optional": return `${child(node.inner, original?.kind === node.kind ? original.inner : undefined)} | ${node.kind === "nullable" ? "null" : "undefined"}`;
      case "transform": return side === "input" ? child(node.inner, original?.kind === "transform" ? original.inner : undefined) : "unknown";
      case "object": {
        const open = node.unknownProperties === "passthrough" || (side === "input" && node.unknownProperties === "strip");
        const keys = original?.kind === "object" ? Object.keys(original.shape) : Object.keys(node.shape);
        if (!keys.length && !open) return "{}";
        const required = new Set(node.required);
        const lines = keys.map((key) => {
          let definition = node.shape[key]!;
          let prior = original?.kind === "object" ? original.shape[key] : undefined;
          const optional = !required.has(key);
          if (optional && definition.kind === "optional") {
            definition = definition.inner;
            if (prior?.kind === "optional") prior = prior.inner;
          }
          return `${" ".repeat(indent + 2)}${formatPropertyKey(key)}${optional ? "?" : ""}: ${render(definition, indent + 2, prior)};`;
        });
        if (open) lines.push(`${" ".repeat(indent + 2)}readonly [key: string]: unknown;`);
        return `{\n${lines.join("\n")}\n${" ".repeat(indent)}}`;
      }
    }
  }

  const declarations = [`export type ${typeName} = ${render(graph.root, 0, legacy)};`];
  for (const [id, name] of names) declarations.push(`export type ${name} = ${render(graph.definitions[id]!, 0)};`);
  return `${declarations.join("\n\n")}\n`;
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
  return /^[A-Za-z_$][\w$]*$/.test(name) && !reservedNames.has(name);
}

const reservedNames = new Set("any unknown never number string boolean object bigint symbol undefined null true false void typeof extends in this new import export default class enum const var function return delete do else for if instanceof switch throw try catch finally while with super break case continue debugger as".split(" "));
