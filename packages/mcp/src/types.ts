import type { Schema } from "@safe-shape/core";

export interface McpContractEntry {
  readonly id: string;
  readonly description: string;
  readonly schema: Schema<any, any>;
}
export interface McpToolCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly inputId: string;
  readonly outputId: string;
}
export interface McpContractRegistry {
  readonly contracts: readonly McpContractEntry[];
  readonly tools: readonly McpToolCatalogEntry[];
  getContract(id: string): McpContractEntry | undefined;
  getTool(id: string): McpToolCatalogEntry | undefined;
}
