import type { ContractCounterexample, GraphCompatibilityFinding, HttpCompatibilityPresentation, MigrationDiagnostics } from "@safe-shape/compat";

type ReviewEntry = { readonly name: string; readonly error: { readonly code: string; readonly message: string } } | {
  readonly name: string;
  readonly status: string;
  readonly compatibility: string;
  readonly side?: string;
  readonly previousFingerprint: string;
  readonly nextFingerprint: string;
  readonly findings: readonly GraphCompatibilityFinding[];
  readonly migration: MigrationDiagnostics;
  readonly counterexamples?: readonly ContractCounterexample[];
  readonly http?: HttpCompatibilityPresentation<GraphCompatibilityFinding>;
};

function escape(value: string): string {
  return value.replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]!)
    .replace(/[\u0000-\u001f\u007f]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, "0")}`)
    .replace(/[\\`*_{}\[\]()#+.!|~\-]/g, "\\$&");
}

function jsonBlock(value: unknown): string {
  const json = JSON.stringify(value, null, 2);
  let fenceLength = 3;
  for (const run of json.matchAll(/`+/g)) fenceLength = Math.max(fenceLength, run[0].length + 1);
  const fence = "`".repeat(fenceLength);
  return `${fence}json\n${json}\n${fence}`;
}

export function renderContractReview(entries: readonly ReviewEntry[], summary: string): string {
  const lines = ["# Contract review", "", escape(summary)];
  for (const entry of entries) {
    lines.push("", `## ${escape(entry.name)}`, "");
    if ("error" in entry) {
      lines.push(`Operational error: ${escape(entry.error.code)}.`, "", escape(entry.error.message));
      continue;
    }
    lines.push(`Decision: ${escape(entry.migration.decision)}.`, "",
      `Compatibility: ${escape(entry.status)}; direction: ${escape(entry.compatibility)}; side: ${escape(entry.side ?? "input")}.`, "",
      escape(entry.migration.summary), "",
      `Previous fingerprint: ${escape(entry.previousFingerprint)}`, "",
      `Next fingerprint: ${escape(entry.nextFingerprint)}`);
    if (entry.http) lines.push("", escape(entry.http.summary));
    for (const finding of entry.findings) {
      const role = entry.http?.findings.find((item) => item.finding === finding);
      lines.push("", `- Path: ${escape(JSON.stringify(finding.path))}; direction: ${escape(finding.direction)}; status: ${escape(finding.status)}; code: ${escape(finding.code)}.`);
      if (role) lines.push("", `  Affected role: ${escape(role.party)} ${escape(role.role)}.`);
      lines.push("", `  ${escape(finding.message)}`);
      if (finding.suggestion) lines.push("", `  Suggested action: ${escape(finding.suggestion)}`);
    }
    for (const example of entry.counterexamples ?? []) {
      lines.push("", `### Counterexample: ${escape(example.direction)} (${escape(example.side)})`, "",
        `Source: ${escape(example.source)}; target: ${escape(example.target)}; path: [].`, "");
      if (example.status === "available") lines.push(jsonBlock(example.value));
      else lines.push(`Unavailable: ${escape(example.reason)}. Refer to the compatibility decision above.`);
    }
  }
  return lines.join("\n");
}
