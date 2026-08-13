#!/usr/bin/env node
import { realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { describeSchema, formatIssues, type Schema } from "@safe-shape/core";
import { toJsonSchema } from "@safe-shape/json-schema";
import { toTypeScriptType } from "@safe-shape/typescript";
import { validateSchema } from "@safe-shape/validation";

interface CliErrorPayload {
  readonly ok: false;
  readonly command: string;
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

interface ParsedArgs {
  readonly command: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
}

const VERSION = "1.0.0";
const BOOLEAN_FLAGS = new Set(["h", "help", "json"]);
const VALUE_FLAGS = new Set(["export", "input", "module", "name", "out", "schema"]);

export async function main(argv: readonly string[] = process.argv.slice(2)): Promise<number> {
  const parsed = parseArgs(argv);
  const json = parsed.flags.json === true;

  try {
    if (parsed.command.length === 0 || parsed.flags.help === true || parsed.flags.h === true) {
      writeText(helpText());
      return 0;
    }

    if (matches(parsed.command, ["doctor"])) {
      return runDoctor(json);
    }

    if (matches(parsed.command, ["schema", "export"])) {
      return await runSchemaExport(parsed, json);
    }

    if (matches(parsed.command, ["schema", "validate"])) {
      return await runSchemaValidate(parsed, json);
    }

    if (matches(parsed.command, ["schema", "types"])) {
      return await runSchemaTypes(parsed, json);
    }

    throw new CliError("unknown_command", `Unknown command: ${parsed.command.join(" ")}`);
  } catch (error) {
    writeError(error, parsed.command.join(" ") || "help", json);
    return 1;
  }
}

function runDoctor(json: boolean): number {
  const payload = {
    ok: true,
    command: "doctor",
    version: VERSION,
    node: process.version,
    auth_required: false,
    packages: {
      core: true,
      json_schema: true,
      typescript: true,
      validation: true,
    },
  };

  if (json) {
    writeJson(payload);
    return 0;
  }

  writeText(`safe-shape ${VERSION}\nNode ${process.version}\nAuth required: no`);
  return 0;
}

async function runSchemaExport(parsed: ParsedArgs, json: boolean): Promise<number> {
  const modulePath = getStringFlag(parsed.flags, "module");
  const exportName = getStringFlag(parsed.flags, "export") ?? "default";
  const schemaDialect = getStringFlag(parsed.flags, "schema");
  const outPath = getStringFlag(parsed.flags, "out");

  if (modulePath === undefined) {
    throw new CliError("missing_flag", "Missing required flag: --module <path>");
  }

  const schema = await loadSchemaExport(modulePath, exportName);
  const jsonSchema = toJsonSchema(schema, schemaDialect === undefined ? {} : { schema: schemaDialect });
  const formatted = `${JSON.stringify(jsonSchema, null, 2)}\n`;

  if (outPath !== undefined) {
    const absoluteOutPath = resolve(process.cwd(), outPath);
    await writeFile(absoluteOutPath, formatted, "utf8");

    if (json) {
      writeJson({
        ok: true,
        command: "schema export",
        module: resolveModulePath(modulePath),
        export: exportName,
        output_path: absoluteOutPath,
        bytes: Buffer.byteLength(formatted),
      });
      return 0;
    }

    writeText(`Wrote JSON Schema to ${absoluteOutPath}`);
    return 0;
  }

  if (json) {
    writeJson({
      ok: true,
      command: "schema export",
      module: resolveModulePath(modulePath),
      export: exportName,
      schema: jsonSchema,
    });
    return 0;
  }

  writeText(formatted.trimEnd());
  return 0;
}

async function runSchemaValidate(parsed: ParsedArgs, json: boolean): Promise<number> {
  const modulePath = getStringFlag(parsed.flags, "module");
  const exportName = getStringFlag(parsed.flags, "export") ?? "default";
  const inputPath = getStringFlag(parsed.flags, "input");
  const outPath = getStringFlag(parsed.flags, "out");

  if (modulePath === undefined) {
    throw new CliError("missing_flag", "Missing required flag: --module <path>");
  }

  if (inputPath === undefined) {
    throw new CliError("missing_flag", "Missing required flag: --input <path>");
  }

  const schema = await loadSchemaExport(modulePath, exportName);
  const input = await readJsonInput(inputPath);
  const report = validateSchema(schema, input);
  const payloadBase = {
    command: "schema validate",
    module: resolveModulePath(modulePath),
    export: exportName,
    input: resolveInputPath(inputPath),
  };
  const payload = report.valid
    ? {
        ok: true,
        ...payloadBase,
        ...report,
      }
    : {
        ok: false,
        ...payloadBase,
        ...report,
      };
  const payloadWithOutput = outPath === undefined ? payload : await writeJsonReport(outPath, payload);

  if (report.valid) {
    if (json) {
      writeJson(payloadWithOutput);
      return 0;
    }

    writeText(outPath === undefined ? "Input is valid." : `Input is valid. Wrote validation report to ${resolveFilePath(outPath)}`);
    return 0;
  }

  if (json) {
    writeJson(payloadWithOutput);
    return 1;
  }

  process.stderr.write(
    outPath === undefined
      ? `Input is invalid:\n${formatIssues(report.issues).join("\n")}\n`
      : `Input is invalid:\n${formatIssues(report.issues).join("\n")}\nWrote validation report to ${resolveFilePath(outPath)}\n`,
  );
  return 1;
}

async function runSchemaTypes(parsed: ParsedArgs, json: boolean): Promise<number> {
  const modulePath = getStringFlag(parsed.flags, "module");
  const exportName = getStringFlag(parsed.flags, "export") ?? "default";
  const typeName = getStringFlag(parsed.flags, "name") ?? "SchemaOutput";
  const outPath = getStringFlag(parsed.flags, "out");

  if (modulePath === undefined) {
    throw new CliError("missing_flag", "Missing required flag: --module <path>");
  }

  if (!isValidTypeName(typeName)) {
    throw new CliError("invalid_type_name", `Invalid TypeScript type name: ${typeName}`);
  }

  const schema = await loadSchemaExport(modulePath, exportName);
  const source = toTypeScriptType(schema, { name: typeName });

  if (outPath !== undefined) {
    const absoluteOutPath = resolve(process.cwd(), outPath);
    await writeFile(absoluteOutPath, source, "utf8");

    if (json) {
      writeJson({
        ok: true,
        command: "schema types",
        module: resolveModulePath(modulePath),
        export: exportName,
        type: typeName,
        output_path: absoluteOutPath,
        bytes: Buffer.byteLength(source),
      });
      return 0;
    }

    writeText(`Wrote TypeScript types to ${absoluteOutPath}`);
    return 0;
  }

  if (json) {
    writeJson({
      ok: true,
      command: "schema types",
      module: resolveModulePath(modulePath),
      export: exportName,
      type: typeName,
      source,
    });
    return 0;
  }

  writeText(source.trimEnd());
  return 0;
}

async function loadSchemaExport(modulePath: string, exportName: string): Promise<Schema<any>> {
  const absolutePath = resolveModulePath(modulePath);
  const moduleUrl = pathToFileURL(absolutePath).href;
  const module = await import(moduleUrl) as Record<string, unknown>;

  if (!Object.prototype.hasOwnProperty.call(module, exportName)) {
    throw new CliError("missing_export", `Module does not export "${exportName}".`);
  }

  const candidate = module[exportName];

  if (!isSchema(candidate)) {
    throw new CliError("invalid_schema_export", `Export "${exportName}" is not a SafeShape schema.`);
  }

  return candidate;
}

function isSchema(value: unknown): value is Schema<any> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  try {
    describeSchema(value as Schema<any>);
    return true;
  } catch {
    return false;
  }
}

function resolveModulePath(modulePath: string): string {
  return resolveFilePath(modulePath);
}

function resolveFilePath(path: string): string {
  return isAbsolute(path) ? path : resolve(process.cwd(), path);
}

async function readJsonInput(inputPath: string): Promise<unknown> {
  const text = inputPath === "-" ? await readStdin() : await readFile(resolveFilePath(inputPath), "utf8");

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    if (error instanceof Error) {
      throw new CliError("invalid_json", `Input file is not valid JSON: ${error.message}`);
    }

    throw new CliError("invalid_json", "Input file is not valid JSON.");
  }
}

function resolveInputPath(inputPath: string): string {
  return inputPath === "-" ? "stdin" : resolveFilePath(inputPath);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }

  return Buffer.concat(chunks).toString("utf8");
}

async function writeJsonReport<TPayload extends object>(
  outPath: string,
  payload: TPayload,
): Promise<TPayload & { readonly output_path: string; readonly bytes: number }> {
  const absoluteOutPath = resolveFilePath(outPath);
  const report = `${JSON.stringify(payload, null, 2)}\n`;
  await writeFile(absoluteOutPath, report, "utf8");

  return {
    ...payload,
    output_path: absoluteOutPath,
    bytes: Buffer.byteLength(report),
  };
}

function parseArgs(argv: readonly string[]): ParsedArgs {
  const command: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]!;

    if (!token.startsWith("-")) {
      command.push(token);
      continue;
    }

    const normalized = token.replace(/^-+/, "");
    const inlineValueIndex = normalized.indexOf("=");

    if (inlineValueIndex !== -1) {
      const name = normalized.slice(0, inlineValueIndex);
      const value = normalized.slice(inlineValueIndex + 1);
      flags[name] = BOOLEAN_FLAGS.has(name) ? value !== "false" : value;
      continue;
    }

    const next = argv[index + 1];

    if (VALUE_FLAGS.has(normalized) && next !== undefined && (next === "-" || !next.startsWith("-"))) {
      flags[normalized] = next;
      index += 1;
      continue;
    }

    flags[normalized] = true;
  }

  return { command: Object.freeze(command), flags: Object.freeze(flags) };
}

function matches(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((part, index) => part === expected[index]);
}

function getStringFlag(flags: Readonly<Record<string, string | boolean>>, name: string): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

function isValidTypeName(name: string): boolean {
  return /^[A-Za-z_$][\w$]*$/.test(name);
}

function writeJson(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function writeText(value: string): void {
  process.stdout.write(`${value}\n`);
}

function writeError(error: unknown, command: string, json: boolean): void {
  const cliError = normalizeError(error);

  if (json) {
    const payload: CliErrorPayload = {
      ok: false,
      command,
      error: {
        code: cliError.code,
        message: cliError.message,
      },
    };
    process.stderr.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  process.stderr.write(`Error: ${cliError.message}\n`);
}

function normalizeError(error: unknown): CliError {
  if (error instanceof CliError) {
    return error;
  }

  if (error instanceof Error) {
    return new CliError("error", error.message);
  }

  return new CliError("error", "Unknown error.");
}

function helpText(): string {
  return `safe-shape ${VERSION}

Usage:
  safe-shape [--json] doctor
  safe-shape [--json] schema export --module <file> [--export <name>] [--schema <uri>] [--out <file>]
  safe-shape [--json] schema validate --module <file> [--export <name>] --input <file|-> [--out <file>]
  safe-shape [--json] schema types --module <file> [--export <name>] [--name <type>] [--out <file>]

Commands:
  doctor         Check CLI runtime and package availability.
  schema export Export a SafeShape schema module to JSON Schema.
  schema validate Validate a JSON file through a SafeShape schema module.
  schema types  Generate a TypeScript type from a SafeShape schema module.

Options:
  --json         Emit a stable machine-readable JSON envelope.
  --module       JavaScript ESM module containing a SafeShape schema export.
  --input        JSON file to validate, or - to read stdin.
  --export       Named export to load. Defaults to default.
  --name         TypeScript type name for schema types. Defaults to SchemaOutput.
  --schema       Optional JSON Schema dialect URI.
  --out          Write output to a file instead of stdout.
  --help, -h     Show help.
`;
}

class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

function isDirectExecution(): boolean {
  const entrypoint = process.argv[1];

  if (entrypoint === undefined) {
    return false;
  }

  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(entrypoint);
  } catch {
    return false;
  }
}

if (isDirectExecution()) {
  process.exitCode = await main();
}
