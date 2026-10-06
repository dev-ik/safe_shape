import { describeContract } from "@safe-shape/core";
import type { McpContractEntry, McpContractRegistry, McpToolCatalogEntry } from "./types.js";

export function requireId(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 128) {
    throw new TypeError("IDs must be non-empty strings of at most 128 characters.");
  }
}
export function requireDescription(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.trim().length === 0) throw new TypeError("A description is required.");
}
export function createMcpContractRegistry(
  entries: readonly McpContractEntry[], tools: readonly McpToolCatalogEntry[] = [],
): McpContractRegistry {
  if (!Array.isArray(entries) || !Array.isArray(tools)) throw new TypeError("Registry entries must be arrays.");
  const contracts = new Map<string, McpContractEntry>();
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") throw new TypeError("Invalid contract entry.");
    requireId(entry.id); requireDescription(entry.description);
    if (contracts.has(entry.id)) throw new TypeError("Duplicate contract ID.");
    describeContract(entry.schema);
    contracts.set(entry.id, Object.freeze({ id: entry.id, description: entry.description, schema: entry.schema }));
  }
  const catalog = new Map<string, McpToolCatalogEntry>();
  const names = new Set<string>();
  for (const entry of tools) {
    if (!entry || typeof entry !== "object") throw new TypeError("Invalid tool entry.");
    requireId(entry.id); requireId(entry.name); requireDescription(entry.description);
    if (!/^[A-Za-z0-9_.-]+$/.test(entry.name)) throw new TypeError("Invalid MCP tool name.");
    requireId(entry.inputId); requireId(entry.outputId);
    if (catalog.has(entry.id) || names.has(entry.name)) throw new TypeError("Duplicate tool ID or name.");
    if (!contracts.has(entry.inputId) || !contracts.has(entry.outputId)) throw new TypeError("Unknown tool contract ID.");
    catalog.set(entry.id, Object.freeze({ id: entry.id, name: entry.name, description: entry.description, inputId: entry.inputId, outputId: entry.outputId }));
    names.add(entry.name);
  }
  const byId = <T extends { readonly id: string }>(values: Iterable<T>): readonly T[] => Object.freeze([...values].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return Object.freeze({ contracts: byId(contracts.values()), tools: byId(catalog.values()), getContract: (id: string) => contracts.get(id), getTool: (id: string) => catalog.get(id) });
}
