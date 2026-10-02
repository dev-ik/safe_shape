import { createHash } from "node:crypto";
import { literal, object, type SchemaDefinition } from "@safe-shape/core";
import { compareContractSnapshotsV2, createContractSnapshotV2, parseContractSnapshotV2, type ContractSnapshotV2, type GraphCompatibilityReport } from "@safe-shape/compat";
import { apiContract, assertKeys, assertRecord, pathParameters, REQUEST_SECTIONS, validateOperationId, validateParameterObject, validateRoute, validateStatus, validateWireGraph, type ApiContract, type HttpMethod } from "./catalog.js";

export const API_SNAPSHOT_FORMAT = "safe-shape.api/v1" as const;
export interface ApiEndpointSnapshot {
  readonly method: HttpMethod;
  readonly path: string;
  readonly request: Readonly<Partial<Record<typeof REQUEST_SECTIONS[number], ContractSnapshotV2>>>;
  readonly responses: Readonly<Record<string, ContractSnapshotV2 | null>>;
}
export interface ApiSnapshot {
  readonly format: typeof API_SNAPSHOT_FORMAT;
  readonly fingerprint: string;
  readonly endpoints: Readonly<Record<string, ApiEndpointSnapshot>>;
}
export interface ApiCompatibilityFinding {
  readonly endpoint: string;
  readonly code: "api.endpoint.added" | "api.endpoint.removed" | "api.route.changed" | "api.request.changed" | "api.response.changed" | "api.response.added" | "api.response.removed";
  readonly status: "safe" | "breaking" | "risky" | "unknown" | "annotation-only";
  readonly path: readonly string[];
  readonly message: string;
  readonly comparison?: GraphCompatibilityReport;
}
export interface ApiCompatibilityReport {
  readonly compatible: boolean;
  readonly decision: "compatible" | "migration-required" | "manual-review";
  readonly previousFingerprint: string;
  readonly nextFingerprint: string;
  readonly findings: readonly ApiCompatibilityFinding[];
}

export function createApiSnapshot(api: ApiContract): ApiSnapshot {
  const catalog = apiContract(api.endpoints);
  const endpoints: Record<string, ApiEndpointSnapshot> = Object.create(null);
  for (const [id, endpoint] of Object.entries(catalog.endpoints)) {
    const request: Partial<Record<typeof REQUEST_SECTIONS[number], ContractSnapshotV2>> = {};
    for (const section of REQUEST_SECTIONS) {
      const schema = endpoint.config.request?.[section];
      if (schema !== undefined) request[section] = createContractSnapshotV2(schema, { id: `${id}.request.${section}` });
    }
    const responses: Record<string, ContractSnapshotV2 | null> = Object.create(null);
    for (const status of Object.keys(endpoint.config.responses).sort()) {
      const schema = endpoint.config.responses[Number(status)]!;
      responses[status] = schema === null ? null : createContractSnapshotV2(schema, { id: `${id}.responses.${status}` });
    }
    endpoints[id] = Object.freeze({ method: endpoint.config.method, path: endpoint.config.path, request: Object.freeze(request), responses: Object.freeze(responses) });
  }
  return snapshot(Object.freeze(endpoints));
}

export function parseApiSnapshot(value: unknown): ApiSnapshot {
  assertRecord(value, "API snapshot");
  assertKeys(value, ["format", "fingerprint", "endpoints"]);
  if (value["format"] !== API_SNAPSHOT_FORMAT) throw new TypeError("Unsupported API snapshot format.");
  const raw = value["endpoints"];
  assertRecord(raw, "Snapshot endpoints");
  const endpoints: Record<string, ApiEndpointSnapshot> = Object.create(null);
  const routes = new Set<string>();
  for (const id of Object.keys(raw).sort()) {
    validateOperationId(id);
    const entry = raw[id];
    assertRecord(entry, "Endpoint snapshot");
    assertKeys(entry, ["method", "path", "request", "responses"]);
    if (typeof entry["method"] !== "string" || typeof entry["path"] !== "string") throw new TypeError("Invalid snapshot route.");
    const method = entry["method"];
    const path = entry["path"];
    validateRoute(method, path);
    const route = method + " " + path.replace(/\{[^}]+\}/g, "{}");
    if (routes.has(route)) throw new TypeError("Duplicate snapshot route.");
    routes.add(route);
    const req = entry["request"];
    assertRecord(req, "Snapshot request");
    assertKeys(req, REQUEST_SECTIONS);
    const request: Partial<Record<typeof REQUEST_SECTIONS[number], ContractSnapshotV2>> = {};
    for (const section of REQUEST_SECTIONS) {
      if (!Object.hasOwn(req, section)) continue;
      const schema = readWireSnapshot(req[section], `${id}.request.${section}`);
      if (section !== "body") validateParameterObject(schema.input.root as SchemaDefinition, section, pathParameters(path));
      request[section] = schema;
    }
    if (pathParameters(path).length && !request.params) throw new TypeError("Snapshot path placeholders require params.");
    if ((method === "get" || method === "head") && request.body) throw new TypeError("GET/HEAD snapshot cannot have a body.");
    const res = entry["responses"];
    assertRecord(res, "Snapshot responses");
    if (!Object.keys(res).length) throw new TypeError("Snapshot requires responses.");
    const responses: Record<string, ContractSnapshotV2 | null> = Object.create(null);
    for (const status of Object.keys(res).sort()) {
      validateStatus(status);
      if ((method === "head" || [204, 205, 304].includes(Number(status))) && res[status] !== null) throw new TypeError("No-body status must use null.");
      responses[status] = res[status] === null ? null : readWireSnapshot(res[status], `${id}.responses.${status}`);
    }
    endpoints[id] = Object.freeze({ method: method as HttpMethod, path, request: Object.freeze(request), responses: Object.freeze(responses) });
  }
  const result = snapshot(Object.freeze(endpoints));
  if (value["fingerprint"] !== result.fingerprint) throw new TypeError("API snapshot fingerprint mismatch.");
  return result;
}

function readWireSnapshot(value: unknown, id: string): ContractSnapshotV2 {
  const result = parseContractSnapshotV2(value);
  if (result.id !== id) throw new TypeError("Unexpected endpoint schema snapshot id.");
  validateWireGraph(result.input.root as SchemaDefinition, result.input.definitions as Readonly<Record<string, SchemaDefinition>>);
  // Wire comparison uses input domains. Native intersections may have an opaque
  // output description even when no transform or strip rule exists on input.
  return result;
}
function snapshot(endpoints: ApiSnapshot["endpoints"]): ApiSnapshot {
  const format = API_SNAPSHOT_FORMAT;
  const fingerprint = createHash("sha256").update(JSON.stringify({ format, endpoints })).digest("hex");
  return Object.freeze({ format, fingerprint, endpoints });
}

/** Compare a server update against the requests/responses of existing clients. */
export function compareApiSnapshots(previous: ApiSnapshot, next: ApiSnapshot): ApiCompatibilityReport {
  const before = parseApiSnapshot(previous);
  const after = parseApiSnapshot(next);
  const findings: ApiCompatibilityFinding[] = [];
  function add(endpoint: string, code: ApiCompatibilityFinding["code"], status: ApiCompatibilityFinding["status"], path: readonly string[], message: string, comparison?: GraphCompatibilityReport): void {
    findings.push(Object.freeze({ endpoint, code, status, path: Object.freeze([...path]), message, ...(comparison === undefined ? {} : { comparison }) }));
  }
  for (const id of [...new Set([...Object.keys(before.endpoints), ...Object.keys(after.endpoints)])].sort()) {
    const old = before.endpoints[id];
    const current = after.endpoints[id];
    if (!old) { add(id, "api.endpoint.added", "safe", [], "Endpoint added."); continue; }
    if (!current) { add(id, "api.endpoint.removed", "breaking", [], "Existing clients can no longer call this endpoint."); continue; }
    if (old.method !== current.method || old.path !== current.path) {
      add(id, "api.route.changed", "breaking", [], "Endpoint method or path changed.");
    }
    for (const section of REQUEST_SECTIONS) {
      const first = old.request[section];
      const second = current.request[section];
      if (!first && !second) continue;
      if (!second) {
        add(id, "api.request.changed", "unknown", ["request", section], "Request section removed; review whether existing wire data is still handled.");
        continue;
      }
      const source = first ?? createContractSnapshotV2(section === "body" ? literal(undefined) : object({}), { id: second.id });
      const comparison = compareContractSnapshotsV2(source, second, { side: "input", compatibility: "backward" });
      add(id, "api.request.changed", comparison.status, ["request", section], "Existing request values must remain accepted by the new server.", comparison);
    }
    for (const status of [...new Set([...Object.keys(old.responses), ...Object.keys(current.responses)])].sort()) {
      const first = old.responses[status];
      const second = current.responses[status];
      if (first === undefined) { add(id, "api.response.added", "breaking", ["responses", status], "New response status is not declared by existing clients."); continue; }
      if (second === undefined) { add(id, "api.response.removed", "safe", ["responses", status], "Server no longer declares this response status."); continue; }
      if (first === null || second === null) {
        if (first !== second) add(id, "api.response.changed", "breaking", ["responses", status], "Response changed between JSON and no-body.");
        continue;
      }
      const comparison = compareContractSnapshotsV2(first, second, { side: "input", compatibility: "forward" });
      add(id, "api.response.changed", comparison.status, ["responses", status], "New wire responses must remain accepted by existing clients.", comparison);
    }
  }
  const breaking = findings.some((finding) => finding.status === "breaking");
  const review = findings.some((finding) => finding.status === "unknown" || finding.status === "risky");
  return Object.freeze({ compatible: !breaking && !review, decision: breaking ? "migration-required" : review ? "manual-review" : "compatible", previousFingerprint: before.fingerprint, nextFingerprint: after.fingerprint, findings: Object.freeze(findings) });
}
