#!/usr/bin/env node
import { readFileSync, realpathSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  CONTRACT_SNAPSHOT_V2_FORMAT,
  compareContractSnapshots,
  compareContractSnapshotsV2,
  createContractSnapshot,
  createContractSnapshotV2,
  createMigrationDiagnostics,
  parseContractSnapshot,
  parseContractSnapshotV2,
  type ContractSide,
  type ContractSnapshot,
  type ContractSnapshotV2,
  type CompatibilityMode,
} from "@safe-shape/compat";
import { describeSchema, formatIssues, type Schema } from "@safe-shape/core";
import {
  JsonSchemaExportError,
  toJsonSchema,
  type JsonSchemaExportIssue,
} from "@safe-shape/json-schema";
import { toTypeScriptType } from "@safe-shape/typescript";
import { validateSchema } from "@safe-shape/validation";

interface CliErrorPayload {
  readonly ok: false;
  readonly command: string;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly issues?: readonly JsonSchemaExportIssue[];
  };
}

interface ParsedArgs {
  readonly command: readonly string[];
  readonly flags: Readonly<Record<string, string | boolean>>;
}

const packageManifest = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
) as { readonly version?: unknown };
const VERSION = packageManifest.version;

if (typeof VERSION !== "string") {
  throw new TypeError("@safe-shape/cli package version is missing.");
}
const BOOLEAN_FLAGS = new Set(["h", "help", "json"]);
const VALUE_FLAGS = new Set([
  "against",
  "compatibility",
  "export",
  "format",
  "id",
  "input",
  "module",
  "name",
  "out",
  "schema",
  "side",
]);

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

    if (matches(parsed.command, ["contract", "snapshot"])) {
      return await runContractSnapshot(parsed, json);
    }

    if (matches(parsed.command, ["contract", "check"])) {
      return await runContractCheck(parsed, json);
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
      compat: true,
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

async function runContractSnapshot(parsed: ParsedArgs, json: boolean): Promise<number> {
  const modulePath = getStringFlag(parsed.flags, "module");
  const exportName = getStringFlag(parsed.flags, "export") ?? "default";
  const contractId = getStringFlag(parsed.flags, "id") ?? exportName;
  const format = parseContractSnapshotFormat(getStringFlag(parsed.flags, "format"));
  const outPath = getStringFlag(parsed.flags, "out");

  if (modulePath === undefined) {
    throw new CliError("missing_flag", "Missing required flag: --module <path>");
  }

  const schema = await loadSchemaExport(modulePath, exportName);
  const snapshot = format === "v2"
    ? createContractSnapshotV2(schema, { id: contractId })
    : createContractSnapshot(schema, { id: contractId });
  const formatted = `${JSON.stringify(snapshot, null, 2)}\n`;

  if (outPath !== undefined) {
    const absoluteOutPath = resolveFilePath(outPath);
    await writeFile(absoluteOutPath, formatted, "utf8");

    if (json) {
      writeJson({
        ok: true,
        command: "contract snapshot",
        module: resolveModulePath(modulePath),
        export: exportName,
        format: snapshot.format,
        contract_id: snapshot.id,
        fingerprint: snapshot.fingerprint,
        output_path: absoluteOutPath,
        bytes: Buffer.byteLength(formatted),
      });
      return 0;
    }

    writeText(`Wrote contract snapshot ${snapshot.fingerprint} to ${absoluteOutPath}`);
    return 0;
  }

  if (json) {
    writeJson({
      ok: true,
      command: "contract snapshot",
      module: resolveModulePath(modulePath),
      export: exportName,
      format: snapshot.format,
      snapshot,
    });
    return 0;
  }

  writeText(formatted.trimEnd());
  return 0;
}

async function runContractCheck(parsed: ParsedArgs, json: boolean): Promise<number> {
  const modulePath = getStringFlag(parsed.flags, "module");
  const exportName = getStringFlag(parsed.flags, "export") ?? "default";
  const againstPath = getStringFlag(parsed.flags, "against");
  const compatibility = parseCompatibilityMode(getStringFlag(parsed.flags, "compatibility"));
  const requestedSide = getStringFlag(parsed.flags, "side");
  const outPath = getStringFlag(parsed.flags, "out");

  if (modulePath === undefined) {
    throw new CliError("missing_flag", "Missing required flag: --module <path>");
  }

  if (againstPath === undefined) {
    throw new CliError("missing_flag", "Missing required flag: --against <snapshot>");
  }

  const schema = await loadSchemaExport(modulePath, exportName);
  const previous = await readContractSnapshot(againstPath);
  const report = previous.format === CONTRACT_SNAPSHOT_V2_FORMAT
    ? compareContractSnapshotsV2(
        previous,
        createContractSnapshotV2(schema, { id: previous.id }),
        {
          compatibility,
          side: parseContractSide(requestedSide),
        },
      )
    : compareV1ContractSnapshot(previous, schema, compatibility, requestedSide);
  const migration = createMigrationDiagnostics(report);
  const payload = {
    ok: report.compatible,
    command: "contract check",
    module: resolveModulePath(modulePath),
    export: exportName,
    against: resolveFilePath(againstPath),
    format: previous.format,
    ...report,
    migration,
  };
  const payloadWithOutput = outPath === undefined ? payload : await writeJsonReport(outPath, payload);

  if (json) {
    writeJson(payloadWithOutput);
  } else if (report.compatible) {
    writeText(
      report.status === "annotation-only"
        ? "Contract is compatible; only annotations changed."
        : "Contract is compatible.",
    );
  } else {
    const findings = report.findings.map((finding) =>
      `${formatContractPath(finding.path)}: ${finding.message} (${finding.code}, ${finding.direction})`);
    const suggestions = migration.diagnostics.flatMap((diagnostic) => diagnostic.suggestion === undefined
      ? []
      : [`${formatContractPath(diagnostic.path)}: ${diagnostic.suggestion}`]);
    process.stderr.write([
      `Contract compatibility is ${report.status}:`,
      ...findings,
      `Migration: ${migration.summary}`,
      ...suggestions.map((suggestion) => `Suggestion: ${suggestion}`),
      "",
    ].join("\n"));
  }

  return report.compatible ? 0 : 2;
}

async function runSchemaExport(parsed: ParsedArgs, json: boolean): Promise<number> {
  const modulePath = getStringFlag(parsed.flags, "module");
  const exportName = getStringFlag(parsed.flags, "export") ?? "default";
  const schemaDialect = getStringFlag(parsed.flags, "schema");
  const schemaId = getStringFlag(parsed.flags, "id");
  const outPath = getStringFlag(parsed.flags, "out");

  if (modulePath === undefined) {
    throw new CliError("missing_flag", "Missing required flag: --module <path>");
  }

  const schema = await loadSchemaExport(modulePath, exportName);
  const jsonSchema = toJsonSchema(schema, {
    ...(schemaDialect === undefined ? {} : { schema: schemaDialect }),
    ...(schemaId === undefined ? {} : { id: schemaId }),
  });
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

async function loadSchemaExport(
  modulePath: string,
  exportName: string,
): Promise<Schema<any, any>> {
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

function isSchema(value: unknown): value is Schema<any, any> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  try {
    describeSchema(value as Schema<any, any>);
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

async function readContractSnapshot(snapshotPath: string): Promise<ContractSnapshot | ContractSnapshotV2> {
  const absolutePath = resolveFilePath(snapshotPath);
  let value: unknown;

  try {
    value = JSON.parse(await readFile(absolutePath, "utf8")) as unknown;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown JSON error.";
    throw new CliError("invalid_contract_snapshot", `Contract snapshot is not valid JSON: ${message}`);
  }

  try {
    return isSnapshotV2(value) ? parseContractSnapshotV2(value) : parseContractSnapshot(value);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown snapshot error.";
    throw new CliError("invalid_contract_snapshot", message);
  }
}

function isSnapshotV2(value: unknown): boolean {
  return typeof value === "object" && value !== null &&
    (value as { readonly format?: unknown }).format === CONTRACT_SNAPSHOT_V2_FORMAT;
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

function parseCompatibilityMode(value: string | undefined): CompatibilityMode {
  if (value === undefined) {
    return "backward";
  }

  if (value === "backward" || value === "forward" || value === "full") {
    return value;
  }

  throw new CliError(
    "invalid_compatibility",
    `Invalid compatibility mode: ${value}. Expected backward, forward, or full.`,
  );
}

function parseContractSnapshotFormat(value: string | undefined): "v1" | "v2" {
  if (value === undefined || value === "v1") return "v1";
  if (value === "v2") return "v2";
  throw new CliError("invalid_contract_format", `Invalid contract snapshot format: ${value}. Expected v1 or v2.`);
}

function parseContractSide(value: string | undefined): ContractSide {
  if (value === undefined || value === "input") return "input";
  if (value === "output") return "output";
  throw new CliError("invalid_contract_side", `Invalid contract side: ${value}. Expected input or output.`);
}

function compareV1ContractSnapshot(
  previous: ContractSnapshot,
  schema: Schema<any, any>,
  compatibility: CompatibilityMode,
  requestedSide: string | undefined,
) {
  if (requestedSide !== undefined) {
    throw new CliError(
      "invalid_contract_side",
      "Contract side selection requires a v2 snapshot baseline.",
    );
  }
  return compareContractSnapshots(
    previous,
    createContractSnapshot(schema, { id: previous.id }),
    { compatibility },
  );
}

function formatContractPath(path: readonly (string | number)[]): string {
  if (path.length === 0) {
    return "$";
  }

  return path.reduce<string>((formatted, segment) =>
    typeof segment === "number"
      ? `${formatted}[${segment}]`
      : /^[A-Za-z_$][\w$]*$/.test(segment)
        ? `${formatted}.${segment}`
        : `${formatted}[${JSON.stringify(segment)}]`, "$"
  );
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
        ...(cliError.issues === undefined ? {} : { issues: cliError.issues }),
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

  if (error instanceof JsonSchemaExportError) {
    return new CliError("json_schema_export_failed", error.message, error.issues);
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
  safe-shape [--json] schema export --module <file> [--export <name>] [--schema <uri>] [--id <uri>] [--out <file>]
  safe-shape [--json] schema validate --module <file> [--export <name>] --input <file|-> [--out <file>]
  safe-shape [--json] schema types --module <file> [--export <name>] [--name <type>] [--out <file>]
  safe-shape [--json] contract snapshot --module <file> [--export <name>] [--id <id>] [--format <v1|v2>] [--out <file>]
  safe-shape [--json] contract check --module <file> [--export <name>] --against <snapshot> [--compatibility <mode>] [--side <input|output>] [--out <file>]

Commands:
  doctor         Check CLI runtime and package availability.
  schema export Export a SafeShape schema module to JSON Schema.
  schema validate Validate a JSON file through a SafeShape schema module.
  schema types  Generate a TypeScript type from a SafeShape schema module.
  contract snapshot Create a deterministic contract snapshot and fingerprint.
  contract check Compare a schema with a stored contract snapshot.

Options:
  --json         Emit a stable machine-readable JSON envelope.
  --module       JavaScript ESM module containing a SafeShape schema export.
  --input        JSON file to validate, or - to read stdin.
  --export       Named export to load. Defaults to default.
  --name         TypeScript type name for schema types. Defaults to SchemaOutput.
  --schema       Optional JSON Schema dialect URI.
  --out          Write output to a file instead of stdout.
  --id           Root $id for schema export, or stable contract id for snapshots.
  --format       Contract snapshot format: v1 (default) or v2.
  --against      Contract snapshot file used as the compatibility baseline.
  --compatibility Compatibility mode: backward (default), forward, or full.
  --side         V2 contract graph side: input (default) or output.
  --help, -h     Show help.
`;
}

class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly issues?: readonly JsonSchemaExportIssue[],
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
