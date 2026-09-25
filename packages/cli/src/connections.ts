import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { checkContractConnection, parseContractSnapshotV2, type ContractConnectionReport } from "@safe-shape/compat";
import { formatIssuePath } from "@safe-shape/core";

interface ConnectionEntry { readonly name: string; readonly producer: string; readonly consumer: string; }
type EntryResult = { readonly name: string; readonly ok: true; readonly report: ContractConnectionReport }
  | { readonly name: string; readonly ok: false; readonly error: { readonly code: "connection_failed"; readonly message: string } };

export function renderConnections(results: readonly EntryResult[]): string {
  return results.map((entry) => {
    if (!entry.ok) return `${entry.name}: error: ${entry.error.message}`;
    const { report } = entry;
    const lines = [
      `${entry.name}: ${report.migration.decision} (${report.producer.id} output -> ${report.consumer.id} input)`,
      `  ${report.migration.summary}`,
    ];
    for (const diagnostic of report.migration.diagnostics) {
      lines.push(`  ${formatIssuePath(diagnostic.path)} [${diagnostic.code}]: ${diagnostic.message}`);
      if (diagnostic.suggestion) lines.push(`    ${diagnostic.suggestion}`);
    }
    if (!report.compatible) {
      const witness = report.counterexample;
      if (witness.status === "available") {
        lines.push(`  Producer input: ${JSON.stringify(witness.producerInput)}`);
        lines.push(`  Emitted value rejected by consumer: ${JSON.stringify(witness.value)}`);
      } else {
        lines.push(`  Counterexample unavailable: ${witness.reason}. Absence is not proof of compatibility.`);
      }
    }
    return lines.join("\n");
  }).join("\n\n");
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

export async function checkConnectionsManifest(path: string) {
  const absolute = resolve(path);
  const manifest: unknown = JSON.parse(await readFile(absolute, "utf8"));
  if (!record(manifest) || manifest.version !== 1 || !Array.isArray(manifest.connections) || !manifest.connections.length ||
    Object.keys(manifest).some((key) => key !== "version" && key !== "connections")) throw new TypeError("Expected a version 1 manifest with non-empty connections.");
  const names = new Set<string>();
  const entries: ConnectionEntry[] = manifest.connections.map((value: unknown) => {
    if (!record(value) || Object.keys(value).some((key) => !["name", "producer", "consumer"].includes(key)) ||
      ![value.name, value.producer, value.consumer].every((item) => typeof item === "string" && item.trim().length > 0)) throw new TypeError("Each connection requires name, producer and consumer snapshot paths.");
    const entry = value as unknown as ConnectionEntry;
    if (names.has(entry.name)) throw new TypeError(`Duplicate connection name: ${entry.name}`);
    names.add(entry.name);
    return entry;
  });
  const results: EntryResult[] = [];
  for (const entry of entries) {
    try {
      const producer = parseContractSnapshotV2(JSON.parse(await readFile(resolve(dirname(absolute), entry.producer), "utf8")));
      const consumer = parseContractSnapshotV2(JSON.parse(await readFile(resolve(dirname(absolute), entry.consumer), "utf8")));
      results.push({ name: entry.name, ok: true, report: checkContractConnection(producer, consumer) });
    } catch (error) {
      results.push({ name: entry.name, ok: false, error: { code: "connection_failed", message: error instanceof Error ? error.message : "Connection check failed." } });
    }
  }
  const errors = results.filter((result) => !result.ok).length;
  const compatible = results.filter((result) => result.ok && result.report.compatible).length;
  const exitCode = errors ? 1 : compatible === results.length ? 0 : 2;
  return { exitCode, payload: { ok: exitCode === 0, command: "contract check-connections", manifest: absolute,
    summary: { total: results.length, compatible, reviewOrMigration: results.length - compatible - errors, errors }, results } };
}
