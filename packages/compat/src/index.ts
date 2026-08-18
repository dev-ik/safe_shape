import { createHash } from "node:crypto";
import {
  describeContract,
  describeSchema,
  type ArrayConstraints,
  type NumberConstraints,
  type Schema,
  type SchemaContractGraph,
  type SchemaDefinition,
  type StringConstraints,
  type StringFormat,
  type UnknownPropertyPolicy,
} from "@safe-shape/core";

export const CONTRACT_SNAPSHOT_FORMAT = "safe-shape.contract/v1" as const;
export const CONTRACT_SNAPSHOT_V2_FORMAT = "safe-shape.contract/v2" as const;

export type CompatibilityMode = "backward" | "forward" | "full";
export type CompatibilityDirection = Exclude<CompatibilityMode, "full">;
export type CompatibilityStatus = "safe" | "breaking" | "risky" | "unknown" | "annotation-only";
export type ContractSide = "input" | "output";
export type ContractPathSegment = string | number;
export type HttpCompatibilityExchange = "request" | "response";
export type HttpCompatibilityParty = "client" | "server";
export type HttpCompatibilityRole = "producer" | "consumer";
export type HttpCompatibilityFocus = HttpCompatibilityRole | "producer-and-consumer";
export type MigrationDecision = "compatible" | "migration-required" | "manual-review";

export interface ContractMetadata {
  readonly title?: string;
  readonly description?: string;
}

export type SpecialLiteralValue = Readonly<{
  readonly $safeShape: "undefined" | "nan" | "infinity" | "-infinity" | "-0";
}>;

export type ContractLiteralValue = string | number | boolean | null | SpecialLiteralValue;

interface ContractNodeBase {
  readonly metadata?: ContractMetadata;
  readonly refinements?: readonly (string | null)[];
}

export type ContractNode =
  | (ContractNodeBase & { readonly kind: "string"; readonly constraints?: StringConstraints })
  | (ContractNodeBase & { readonly kind: "number"; readonly constraints?: NumberConstraints })
  | (ContractNodeBase & { readonly kind: "boolean" })
  | (ContractNodeBase & { readonly kind: "literal"; readonly value: ContractLiteralValue })
  | (ContractNodeBase & { readonly kind: "enum"; readonly values: readonly (string | number)[] })
  | (ContractNodeBase & { readonly kind: "unknown" })
  | (ContractNodeBase & { readonly kind: "never" })
  | (ContractNodeBase & {
      readonly kind: "array";
      readonly item: ContractNode;
      readonly constraints?: ArrayConstraints;
    })
  | (ContractNodeBase & { readonly kind: "tuple"; readonly items: readonly ContractNode[] })
  | (ContractNodeBase & { readonly kind: "union"; readonly choices: readonly ContractNode[] })
  | (ContractNodeBase & {
      readonly kind: "discriminatedUnion";
      readonly discriminator: string;
      readonly choices: readonly ContractNode[];
    })
  | (ContractNodeBase & {
      readonly kind: "intersection";
      readonly left: ContractNode;
      readonly right: ContractNode;
    })
  | (ContractNodeBase & {
      readonly kind: "object";
      readonly shape: Readonly<Record<string, ContractNode>>;
      readonly required: readonly string[];
      readonly unknownProperties: UnknownPropertyPolicy;
    })
  | (ContractNodeBase & {
      readonly kind: "record";
      readonly value: ContractNode;
      readonly key?: StringConstraints;
    })
  | (ContractNodeBase & { readonly kind: "nullable"; readonly inner: ContractNode })
  | (ContractNodeBase & { readonly kind: "optional"; readonly inner: ContractNode })
  | (ContractNodeBase & {
      readonly kind: "transform";
      readonly inner: ContractNode;
      readonly id: string | null;
    });

export type ContractGraphNode =
  | (ContractNodeBase & { readonly kind: "string"; readonly constraints?: StringConstraints })
  | (ContractNodeBase & { readonly kind: "number"; readonly constraints?: NumberConstraints })
  | (ContractNodeBase & { readonly kind: "boolean" })
  | (ContractNodeBase & { readonly kind: "literal"; readonly value: ContractLiteralValue })
  | (ContractNodeBase & { readonly kind: "enum"; readonly values: readonly (string | number)[] })
  | (ContractNodeBase & { readonly kind: "unknown" })
  | (ContractNodeBase & { readonly kind: "never" })
  | (ContractNodeBase & {
      readonly kind: "array";
      readonly item: ContractGraphNode;
      readonly constraints?: ArrayConstraints;
    })
  | (ContractNodeBase & { readonly kind: "tuple"; readonly items: readonly ContractGraphNode[] })
  | (ContractNodeBase & { readonly kind: "union"; readonly choices: readonly ContractGraphNode[] })
  | (ContractNodeBase & {
      readonly kind: "discriminatedUnion";
      readonly discriminator: string;
      readonly choices: readonly ContractGraphNode[];
    })
  | (ContractNodeBase & {
      readonly kind: "intersection";
      readonly left: ContractGraphNode;
      readonly right: ContractGraphNode;
    })
  | (ContractNodeBase & {
      readonly kind: "object";
      readonly shape: Readonly<Record<string, ContractGraphNode>>;
      readonly required: readonly string[];
      readonly unknownProperties: UnknownPropertyPolicy;
    })
  | (ContractNodeBase & {
      readonly kind: "record";
      readonly value: ContractGraphNode;
      readonly key?: StringConstraints;
    })
  | (ContractNodeBase & { readonly kind: "nullable"; readonly inner: ContractGraphNode })
  | (ContractNodeBase & { readonly kind: "optional"; readonly inner: ContractGraphNode })
  | (ContractNodeBase & {
      readonly kind: "transform";
      readonly inner: ContractGraphNode;
      readonly id: string | null;
    })
  | (ContractNodeBase & { readonly kind: "reference"; readonly id: string })
  | (ContractNodeBase & {
      readonly kind: "opaque";
      readonly behavior: "transform";
      readonly id: string | null;
    });

export interface ContractSnapshot {
  readonly format: typeof CONTRACT_SNAPSHOT_FORMAT;
  readonly id: string;
  readonly fingerprint: string;
  readonly contract: ContractNode;
}

export interface ContractGraphSnapshot {
  readonly fingerprint: string;
  readonly root: ContractGraphNode;
  readonly definitions: Readonly<Record<string, ContractGraphNode>>;
}

export interface ContractSnapshotV2 {
  readonly format: typeof CONTRACT_SNAPSHOT_V2_FORMAT;
  readonly id: string;
  readonly fingerprint: string;
  readonly input: ContractGraphSnapshot;
  readonly output: ContractGraphSnapshot;
}

export interface ContractSnapshotOptions {
  readonly id?: string;
}

export interface CompareContractsOptions extends ContractSnapshotOptions {
  readonly compatibility?: CompatibilityMode;
}

export interface CompareContractSnapshotsOptions {
  readonly compatibility?: CompatibilityMode;
}

export interface CompareContractsV2Options extends CompareContractsOptions {
  readonly side?: ContractSide;
}

export interface CompareContractSnapshotsV2Options extends CompareContractSnapshotsOptions {
  readonly side?: ContractSide;
}

export interface CompatibilityFinding<TNode extends ContractGraphNode = ContractNode> {
  readonly code: string;
  readonly status: CompatibilityStatus;
  readonly path: readonly ContractPathSegment[];
  readonly direction: CompatibilityDirection;
  readonly previous: TNode | null;
  readonly next: TNode | null;
  readonly message: string;
  readonly suggestion?: string;
}

export type GraphCompatibilityFinding = CompatibilityFinding<ContractGraphNode>;

export interface CompatibilityReport<
  TFinding extends GraphCompatibilityFinding = CompatibilityFinding,
> {
  readonly compatible: boolean;
  readonly status: CompatibilityStatus;
  readonly compatibility: CompatibilityMode;
  readonly previousFingerprint: string;
  readonly nextFingerprint: string;
  readonly findings: readonly TFinding[];
}

export interface GraphCompatibilityReport extends CompatibilityReport<GraphCompatibilityFinding> {
  readonly side: ContractSide;
}

export interface HttpCompatibilityPresentationOptions {
  readonly exchange: HttpCompatibilityExchange;
}

export interface HttpCompatibilityPresentationFinding<
  TFinding extends GraphCompatibilityFinding = GraphCompatibilityFinding,
> {
  readonly exchange: HttpCompatibilityExchange;
  readonly party: HttpCompatibilityParty;
  readonly role: HttpCompatibilityRole;
  readonly finding: TFinding;
}

export interface HttpCompatibilityPresentation<
  TFinding extends GraphCompatibilityFinding = GraphCompatibilityFinding,
> {
  readonly compatible: boolean;
  readonly status: CompatibilityStatus;
  readonly compatibility: CompatibilityMode;
  readonly exchange: HttpCompatibilityExchange;
  readonly producer: HttpCompatibilityParty;
  readonly consumer: HttpCompatibilityParty;
  readonly focus: HttpCompatibilityFocus;
  readonly previousFingerprint: string;
  readonly nextFingerprint: string;
  readonly side?: ContractSide;
  readonly summary: string;
  readonly findings: readonly HttpCompatibilityPresentationFinding<TFinding>[];
}

export interface MigrationDiagnostic {
  readonly code: string;
  readonly status: "breaking" | "risky" | "unknown";
  readonly path: readonly ContractPathSegment[];
  readonly direction: CompatibilityDirection;
  readonly message: string;
  readonly suggestion?: string;
}

export interface MigrationDiagnosticCounts {
  readonly safe: number;
  readonly breaking: number;
  readonly risky: number;
  readonly unknown: number;
  readonly annotationOnly: number;
}

export interface MigrationDiagnostics {
  readonly decision: MigrationDecision;
  readonly migrationRequired: boolean;
  readonly manualReviewRequired: boolean;
  readonly counts: MigrationDiagnosticCounts;
  readonly summary: string;
  readonly diagnostics: readonly MigrationDiagnostic[];
}

interface Analysis {
  readonly status: CompatibilityStatus;
  readonly findings: readonly GraphCompatibilityFinding[];
}

interface GraphComparisonContext {
  readonly previousDefinitions: Readonly<Record<string, ContractGraphNode>>;
  readonly nextDefinitions: Readonly<Record<string, ContractGraphNode>>;
  readonly activePairs: Set<string>;
  readonly nodeIds: WeakMap<object, number>;
  nextNodeId: number;
}

export function createContractSnapshot(
  schema: Schema<any, any>,
  options: ContractSnapshotOptions = {},
): ContractSnapshot {
  const id = validateId(options.id ?? "default");
  const contract = definitionToContract(describeSchema(schema));
  return freezeSnapshot({
    format: CONTRACT_SNAPSHOT_FORMAT,
    id,
    fingerprint: fingerprintContract(contract),
    contract,
  });
}

export function createContractSnapshotV2(
  schema: Schema<any, any>,
  options: ContractSnapshotOptions = {},
): ContractSnapshotV2 {
  const id = validateId(options.id ?? "default");
  const description = describeContract(schema);
  const input = definitionGraphToSnapshot(description.input);
  const output = definitionGraphToSnapshot(description.output);

  return Object.freeze({
    format: CONTRACT_SNAPSHOT_V2_FORMAT,
    id,
    fingerprint: fingerprintContractGraphs(input, output),
    input,
    output,
  });
}

export function parseContractSnapshot(value: unknown): ContractSnapshot {
  const record = expectRecord(value, "snapshot");

  if (record.format !== CONTRACT_SNAPSHOT_FORMAT) {
    throw new TypeError(`Unsupported contract snapshot format: ${String(record.format)}`);
  }

  const id = validateId(expectString(record.id, "snapshot.id"));
  const fingerprint = expectString(record.fingerprint, "snapshot.fingerprint");
  const contract = parseContractNode(record.contract, "snapshot.contract");
  const expectedFingerprint = fingerprintContract(contract);

  if (fingerprint !== expectedFingerprint) {
    throw new TypeError("Contract snapshot fingerprint does not match its canonical contract.");
  }

  return freezeSnapshot({ format: CONTRACT_SNAPSHOT_FORMAT, id, fingerprint, contract });
}

export function parseContractSnapshotV2(value: unknown): ContractSnapshotV2 {
  const record = expectRecord(value, "snapshot");

  if (record.format !== CONTRACT_SNAPSHOT_V2_FORMAT) {
    throw new TypeError(`Unsupported contract snapshot v2 format: ${String(record.format)}`);
  }

  const id = validateId(expectString(record.id, "snapshot.id"));
  const fingerprint = expectString(record.fingerprint, "snapshot.fingerprint");
  const input = parseContractGraphSnapshot(record.input, "snapshot.input");
  const output = parseContractGraphSnapshot(record.output, "snapshot.output");
  const expectedFingerprint = fingerprintContractGraphs(input, output);

  if (fingerprint !== expectedFingerprint) {
    throw new TypeError("Contract snapshot v2 fingerprint does not match its canonical graphs.");
  }

  return Object.freeze({
    format: CONTRACT_SNAPSHOT_V2_FORMAT,
    id,
    fingerprint,
    input,
    output,
  });
}

export function compareContracts(
  previous: Schema<any, any>,
  next: Schema<any, any>,
  options: CompareContractsOptions = {},
): CompatibilityReport {
  const snapshotOptions = options.id === undefined ? {} : { id: options.id };
  return compareContractSnapshots(
    createContractSnapshot(previous, snapshotOptions),
    createContractSnapshot(next, snapshotOptions),
    options.compatibility === undefined ? {} : { compatibility: options.compatibility },
  );
}

export function compareContractSnapshots(
  previous: ContractSnapshot,
  next: ContractSnapshot,
  options: CompareContractSnapshotsOptions = {},
): CompatibilityReport {
  const compatibility = options.compatibility ?? "backward";
  const analyses: Analysis[] = [];

  if (previous.id !== next.id) {
    analyses.push({
      status: "unknown",
      findings: [createFinding(
        "contract.id.changed",
        "unknown",
        [],
        "backward",
        previous.contract,
        next.contract,
        `Contract id changed from "${previous.id}" to "${next.id}".`,
        "Compare snapshots for the same stable contract id.",
      )],
    });
  } else {
    if (compatibility === "backward" || compatibility === "full") {
      analyses.push(compareNodes(previous.contract, next.contract, [], "backward"));
    }

    if (compatibility === "forward" || compatibility === "full") {
      analyses.push(compareNodes(previous.contract, next.contract, [], "forward"));
    }
  }

  const findings = Object.freeze(
    analyses.flatMap((analysis) => analysis.findings),
  ) as readonly CompatibilityFinding[];
  const status = aggregateStatus(analyses.map((analysis) => analysis.status));

  return Object.freeze({
    compatible: status === "safe" || status === "annotation-only",
    status,
    compatibility,
    previousFingerprint: previous.fingerprint,
    nextFingerprint: next.fingerprint,
    findings,
  });
}

export function compareContractsV2(
  previous: Schema<any, any>,
  next: Schema<any, any>,
  options: CompareContractsV2Options = {},
): GraphCompatibilityReport {
  const snapshotOptions = options.id === undefined ? {} : { id: options.id };
  return compareContractSnapshotsV2(
    createContractSnapshotV2(previous, snapshotOptions),
    createContractSnapshotV2(next, snapshotOptions),
    {
      ...(options.compatibility === undefined ? {} : { compatibility: options.compatibility }),
      ...(options.side === undefined ? {} : { side: options.side }),
    },
  );
}

export function compareContractSnapshotsV2(
  previous: ContractSnapshotV2,
  next: ContractSnapshotV2,
  options: CompareContractSnapshotsV2Options = {},
): GraphCompatibilityReport {
  const compatibility = options.compatibility ?? "backward";
  const side = options.side ?? "input";
  const previousGraph = previous[side];
  const nextGraph = next[side];
  const analyses: Analysis[] = [];

  if (previous.id !== next.id) {
    analyses.push({
      status: "unknown",
      findings: [createFinding(
        "contract.id.changed",
        "unknown",
        [],
        "backward",
        previousGraph.root,
        nextGraph.root,
        `Contract id changed from "${previous.id}" to "${next.id}".`,
        "Compare snapshots for the same stable contract id.",
      )],
    });
  } else {
    if (compatibility === "backward" || compatibility === "full") {
      analyses.push(compareContractGraphs(previousGraph, nextGraph, "backward"));
    }
    if (compatibility === "forward" || compatibility === "full") {
      analyses.push(compareContractGraphs(previousGraph, nextGraph, "forward"));
    }
  }

  const findings = Object.freeze(analyses.flatMap((analysis) => analysis.findings));
  const status = aggregateStatus(analyses.map((analysis) => analysis.status));

  return Object.freeze({
    compatible: isCompatibleStatus(status),
    status,
    compatibility,
    side,
    previousFingerprint: previousGraph.fingerprint,
    nextFingerprint: nextGraph.fingerprint,
    findings,
  });
}

export function createHttpCompatibilityPresentation<
  TFinding extends GraphCompatibilityFinding,
>(
  report: CompatibilityReport<TFinding>,
  options: HttpCompatibilityPresentationOptions,
): HttpCompatibilityPresentation<TFinding> {
  if (options.exchange !== "request" && options.exchange !== "response") {
    throw new TypeError(`Unsupported HTTP compatibility exchange: ${String(options.exchange)}`);
  }

  const producer: HttpCompatibilityParty = options.exchange === "request" ? "client" : "server";
  const consumer: HttpCompatibilityParty = options.exchange === "request" ? "server" : "client";
  const focus: HttpCompatibilityFocus = report.compatibility === "backward"
    ? "consumer"
    : report.compatibility === "forward"
      ? "producer"
      : "producer-and-consumer";
  const findings = Object.freeze(report.findings.map((finding) => {
    const role: HttpCompatibilityRole = finding.direction === "backward" ? "consumer" : "producer";
    return Object.freeze({
      exchange: options.exchange,
      party: role === "consumer" ? consumer : producer,
      role,
      finding,
    });
  }));
  const side = (report as Partial<GraphCompatibilityReport>).side;
  const summary = focus === "producer-and-consumer"
    ? `HTTP ${options.exchange} producer and consumer compatibility is ${report.status}.`
    : `HTTP ${options.exchange} ${focus} compatibility for the ${focus === "producer" ? producer : consumer} is ${report.status}.`;

  return Object.freeze({
    compatible: report.compatible,
    status: report.status,
    compatibility: report.compatibility,
    exchange: options.exchange,
    producer,
    consumer,
    focus,
    previousFingerprint: report.previousFingerprint,
    nextFingerprint: report.nextFingerprint,
    ...(side === undefined ? {} : { side }),
    summary,
    findings,
  });
}

export function createMigrationDiagnostics(
  report: CompatibilityReport<GraphCompatibilityFinding>,
): MigrationDiagnostics {
  const counts = {
    safe: 0,
    breaking: 0,
    risky: 0,
    unknown: 0,
    annotationOnly: 0,
  };

  for (const finding of report.findings) {
    if (finding.status === "annotation-only") counts.annotationOnly += 1;
    else counts[finding.status] += 1;
  }

  const decision: MigrationDecision = report.status === "breaking"
    ? "migration-required"
    : report.status === "risky" || report.status === "unknown"
      ? "manual-review"
      : "compatible";
  const diagnostics = Object.freeze(report.findings.flatMap((finding): readonly MigrationDiagnostic[] => {
    if (finding.status === "safe" || finding.status === "annotation-only") return [];
    return [Object.freeze({
      code: finding.code,
      status: finding.status,
      path: Object.freeze([...finding.path]),
      direction: finding.direction,
      message: finding.message,
      ...(finding.suggestion === undefined ? {} : { suggestion: finding.suggestion }),
    })];
  }));
  const summary = decision === "migration-required"
    ? `Contract migration is required for ${counts.breaking} breaking finding${counts.breaking === 1 ? "" : "s"}.`
    : decision === "manual-review"
      ? `Manual review is required for ${counts.unknown + counts.risky} unproven finding${counts.unknown + counts.risky === 1 ? "" : "s"}.`
      : report.status === "annotation-only"
        ? "No contract migration is required; only annotations changed."
        : "No contract migration is required.";

  return Object.freeze({
    decision,
    migrationRequired: decision === "migration-required",
    manualReviewRequired: decision === "manual-review",
    counts: Object.freeze(counts),
    summary,
    diagnostics,
  });
}

function compareContractGraphs(
  previous: ContractGraphSnapshot,
  next: ContractGraphSnapshot,
  direction: CompatibilityDirection,
): Analysis {
  const context: GraphComparisonContext = {
    previousDefinitions: previous.definitions,
    nextDefinitions: next.definitions,
    activePairs: new Set(),
    nodeIds: new WeakMap(),
    nextNodeId: 0,
  };
  const analysis = compareNodes(previous.root, next.root, [], direction, context);
  const exactEqual = canonicalStringify({ root: previous.root, definitions: previous.definitions }) ===
    canonicalStringify({ root: next.root, definitions: next.definitions });
  const semanticEqual = canonicalStringify(stripGraphMetadata(previous)) ===
    canonicalStringify(stripGraphMetadata(next));

  if (exactEqual && !analysis.findings.some((finding) =>
    finding.code === "opaque.refinement.anonymous" ||
    finding.code === "opaque.transform.anonymous")) {
    return emptyAnalysis("safe");
  }

  if (analysis.status === "safe" && !exactEqual && semanticEqual) {
    return analysisFromFindings([createFinding(
      "contract.annotation.changed",
      "annotation-only",
      [],
      direction,
      previous.root,
      next.root,
      "Contract graph annotations changed without changing accepted values.",
    )]);
  }

  return analysis;
}

function compareReferenceNodes(
  previous: ContractGraphNode,
  next: ContractGraphNode,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  context: GraphComparisonContext,
): Analysis {
  const previousTarget = previous.kind === "reference"
    ? context.previousDefinitions[previous.id]
    : previous;
  const nextTarget = next.kind === "reference"
    ? context.nextDefinitions[next.id]
    : next;

  if (previousTarget === undefined || nextTarget === undefined) {
    return analysisFromFindings([createFinding(
      "reference.target.missing",
      "unknown",
      path,
      direction,
      previous,
      next,
      "A graph reference does not resolve inside its contract snapshot.",
      "Parse or recreate the snapshot before comparing it.",
    )]);
  }

  const pair = `${direction}:${graphNodeKey(previous, "previous", context)}:${graphNodeKey(next, "next", context)}`;
  if (context.activePairs.has(pair)) return emptyAnalysis("safe");

  context.activePairs.add(pair);
  try {
    return compareNodes(previousTarget, nextTarget, path, direction, context);
  } finally {
    context.activePairs.delete(pair);
  }
}

function graphNodeKey(
  node: ContractGraphNode,
  side: "previous" | "next",
  context: GraphComparisonContext,
): string {
  if (node.kind === "reference") return `${side}:reference:${node.id}`;
  let id = context.nodeIds.get(node);
  if (id === undefined) {
    context.nextNodeId += 1;
    id = context.nextNodeId;
    context.nodeIds.set(node, id);
  }
  return `${side}:node:${id}`;
}

function compareNodes(
  previous: ContractGraphNode,
  next: ContractGraphNode,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  context?: GraphComparisonContext,
): Analysis {
  if (context !== undefined && (previous.kind === "reference" || next.kind === "reference")) {
    return compareReferenceNodes(previous, next, path, direction, context);
  }

  const exactEqual = canonicalStringify(previous) === canonicalStringify(next);
  const anonymousOpaque = findAnonymousOpaque(previous, next, path, direction);

  if (context === undefined && exactEqual) {
    return anonymousOpaque.length === 0
      ? emptyAnalysis("safe")
      : analysisFromFindings(anonymousOpaque);
  }

  const semanticEqual = canonicalStringify(stripMetadata(previous)) === canonicalStringify(stripMetadata(next));

  if (context === undefined && semanticEqual) {
    if (anonymousOpaque.length > 0) {
      return analysisFromFindings(anonymousOpaque);
    }

    return analysisFromFindings([createFinding(
      "contract.annotation.changed",
      "annotation-only",
      path,
      direction,
      previous,
      next,
      "Contract annotations changed without changing accepted values.",
    )]);
  }

  if (anonymousOpaque.length > 0) {
    return analysisFromFindings(anonymousOpaque);
  }

  const opaqueFinding = compareOpaque(previous, next, path, direction);
  if (opaqueFinding !== undefined) {
    return analysisFromFindings([opaqueFinding]);
  }

  const source = direction === "backward" ? previous : next;
  const target = direction === "backward" ? next : previous;

  if (isProvablyEmptyNode(source) || target.kind === "unknown") {
    return analysisFromFindings([createFinding(
      "contract.type.widened",
      "safe",
      path,
      direction,
      previous,
      next,
      isProvablyEmptyNode(source)
        ? "The source contract accepts no values, so it is contained by the target contract."
        : "The target unknown contract accepts every source value.",
    )]);
  }

  if (isProvablyEmptyNode(target)) {
    const status = isProvablyInhabitedNode(source) ? "breaking" : "unknown";
    return analysisFromFindings([createFinding(
      "contract.target.empty",
      status,
      path,
      direction,
      previous,
      next,
      status === "breaking"
        ? "The target contract accepts no values, while the source has a constructible value."
        : "The target contract is empty, but source inhabitation cannot be proven.",
      "Keep a target branch that accepts the source values during migration.",
    )]);
  }

  if (source.kind === "unknown") {
    return incompatibleKind(
      previous,
      next,
      path,
      direction,
      "The source unknown contract accepts values outside the target contract.",
    );
  }

  if (source.kind === "union" || target.kind === "union") {
    return compareUnionRelationship(previous, next, path, direction, context);
  }

  if (source.kind === "literal" && target.kind !== "literal" &&
      isLiteralAcceptanceDecidable(target)) {
    const accepted = nodeAcceptsLiteral(target, source.value);
    return analysisFromFindings([createFinding(
      accepted ? "contract.type.widened" : "literal.value.not_accepted",
      accepted ? "safe" : "breaking",
      path,
      direction,
      previous,
      next,
      accepted
        ? "The target contract accepts the source literal."
        : "The target contract rejects the source literal.",
      accepted ? undefined : "Keep the source literal accepted during migration.",
    )]);
  }

  if (source.kind === "enum") {
    return compareEnumRelationship(previous, next, path, direction);
  }

  if (direction === "backward" && next.kind === "nullable") {
    if (previous.kind === "nullable") {
      return compareNodes(previous.inner, next.inner, path, direction, context);
    }
    if (source.kind === "literal" && source.value === null) {
      return emptyAnalysis("safe");
    }
    return compareNodes(previous, next.inner, path, direction, context);
  }

  if (direction === "forward" && previous.kind === "nullable") {
    if (next.kind === "nullable") {
      return compareNodes(previous.inner, next.inner, path, direction, context);
    }
    if (source.kind === "literal" && source.value === null) {
      return emptyAnalysis("safe");
    }
    return compareNodes(previous.inner, next, path, direction, context);
  }

  if ((direction === "backward" && previous.kind === "nullable") ||
      (direction === "forward" && next.kind === "nullable")) {
    return incompatibleKind(previous, next, path, direction, "Nullable values are no longer accepted.");
  }

  if (direction === "backward" && next.kind === "optional") {
    if (previous.kind === "optional") {
      return compareNodes(previous.inner, next.inner, path, direction, context);
    }
    if (source.kind === "literal" && isUndefinedLiteral(source.value)) {
      return emptyAnalysis("safe");
    }
    return compareNodes(previous, next.inner, path, direction, context);
  }

  if (direction === "forward" && previous.kind === "optional") {
    if (next.kind === "optional") {
      return compareNodes(previous.inner, next.inner, path, direction, context);
    }
    if (source.kind === "literal" && isUndefinedLiteral(source.value)) {
      return emptyAnalysis("safe");
    }
    return compareNodes(previous.inner, next, path, direction, context);
  }

  if ((direction === "backward" && previous.kind === "optional") ||
      (direction === "forward" && next.kind === "optional")) {
    return incompatibleKind(previous, next, path, direction, "Undefined values are no longer accepted.");
  }

  if ((source.kind === "tuple" && target.kind === "array") ||
      (source.kind === "array" && target.kind === "tuple")) {
    return compareTupleArrayRelationship(previous, next, path, direction, context);
  }

  if (previous.kind !== next.kind) {
    const status = isProvablyBreakingKindChange(source, target) ? "breaking" : "unknown";
    return kindChange(
      previous,
      next,
      path,
      direction,
      status,
      status === "breaking"
        ? "Schema kind changed incompatibly."
        : "Compatibility for this schema kind change cannot be proven.",
    );
  }

  switch (previous.kind) {
    case "string":
      return compareStringConstraints(
        previous,
        next as Extract<ContractGraphNode, { readonly kind: "string" }>,
        path,
        direction,
      );
    case "number":
      return compareNumberConstraints(
        previous,
        next as Extract<ContractGraphNode, { readonly kind: "number" }>,
        path,
        direction,
      );
    case "boolean":
      return emptyAnalysis("safe");
    case "literal":
      return analysisFromFindings([createFinding(
        "literal.value.changed",
        "breaking",
        path,
        direction,
        previous,
        next,
        "The accepted literal value changed.",
        "Keep the previous literal or use a union during migration.",
      )]);
    case "enum":
      return compareEnumRelationship(previous, next, path, direction);
    case "discriminatedUnion":
      return analysisFromFindings([createFinding(
        "discriminated_union.changed",
        "unknown",
        path,
        direction,
        previous,
        next,
        "Discriminated union structure changed; containment rules are not implemented yet.",
        "Keep the previous branches until structural compatibility rules are enabled.",
      )]);
    case "intersection":
      return analysisFromFindings([createFinding(
        "intersection.changed",
        "unknown",
        path,
        direction,
        previous,
        next,
        "Intersection structure changed; containment rules are not implemented yet.",
        "Keep both intersection operands stable until structural compatibility rules are enabled.",
      )]);
    case "unknown":
    case "never":
      return emptyAnalysis("safe");
    case "array":
      return compareArrays(
        previous,
        next as Extract<ContractGraphNode, { readonly kind: "array" }>,
        path,
        direction,
        context,
      );
    case "tuple":
      return compareTuples(
        previous,
        next as Extract<ContractGraphNode, { readonly kind: "tuple" }>,
        path,
        direction,
        context,
      );
    case "object":
      return compareObjects(
        previous,
        next as Extract<ContractGraphNode, { readonly kind: "object" }>,
        path,
        direction,
        context,
      );
    case "record":
      return compareRecords(
        previous,
        next as Extract<ContractGraphNode, { readonly kind: "record" }>,
        path,
        direction,
        context,
      );
    case "nullable":
    case "optional":
    case "transform":
      return compareNodes(
        previous.inner,
        (next as Extract<ContractGraphNode, { readonly kind: typeof previous.kind }>).inner,
        path,
        direction,
        context,
      );
    case "union":
      return compareUnionRelationship(previous, next, path, direction, context);
    case "opaque":
      return emptyAnalysis("safe");
    case "reference":
      return analysisFromFindings([createFinding(
        "reference.unresolved",
        "unknown",
        path,
        direction,
        previous,
        next,
        "Contract reference cannot be compared without graph definitions.",
      )]);
  }
}

function compareStringConstraints(
  previous: Extract<ContractGraphNode, { readonly kind: "string" }>,
  next: Extract<ContractGraphNode, { readonly kind: "string" }>,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
): Analysis {
  if (previous.constraints?.pattern !== next.constraints?.pattern) {
    return analysisFromFindings([createFinding(
      "string.pattern.changed",
      "unknown",
      path,
      direction,
      previous,
      next,
      "String pattern changed; regular-language containment is not implemented yet.",
      "Review the pattern relationship manually or retain the previous pattern.",
    )]);
  }

  if (previous.constraints?.format !== next.constraints?.format) {
    return analysisFromFindings([createFinding(
      "string.format.changed",
      "unknown",
      path,
      direction,
      previous,
      next,
      "String format changed; format containment is not implemented yet.",
      "Review the format relationship manually or retain the previous format.",
    )]);
  }

  const source = direction === "backward" ? previous : next;
  const target = direction === "backward" ? next : previous;
  const sourceMin = source.constraints?.minLength ?? 0;
  const sourceMax = source.constraints?.maxLength ?? Number.POSITIVE_INFINITY;
  const targetMin = target.constraints?.minLength ?? 0;
  const targetMax = target.constraints?.maxLength ?? Number.POSITIVE_INFINITY;
  const status = sourceMin >= targetMin && sourceMax <= targetMax ? "safe" : "breaking";

  return constraintAnalysis(
    "string.length.changed",
    status,
    previous,
    next,
    path,
    direction,
    "string length",
  );
}

function compareNumberConstraints(
  previous: Extract<ContractGraphNode, { readonly kind: "number" }>,
  next: Extract<ContractGraphNode, { readonly kind: "number" }>,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
): Analysis {
  const source = direction === "backward" ? previous : next;
  const target = direction === "backward" ? next : previous;
  const sourceInteger = isIntegerOnly(source.constraints);
  const targetInteger = isIntegerOnly(target.constraints);
  const sourceRange = effectiveNumberRange(source.constraints, sourceInteger);
  const targetRange = effectiveNumberRange(target.constraints, targetInteger);
  const rangeAccepted = sourceRange.minimum >= targetRange.minimum &&
    sourceRange.maximum <= targetRange.maximum;
  const sourceMultiple = source.constraints?.multipleOf;
  const targetMultiple = target.constraints?.multipleOf;
  const integerAccepted = !targetInteger || sourceInteger ||
    (sourceMultiple !== undefined && isExactDecimalMultiple(sourceMultiple, 1));
  const structuralStatus = rangeAccepted && integerAccepted
    ? "safe"
    : sourceMultiple === undefined
      ? "breaking"
      : "unknown";
  const structuralAnalysis = structuralStatus === "unknown"
    ? analysisFromFindings([createFinding(
        "number.constraints.changed",
        "unknown",
        path,
        direction,
        previous,
        next,
        "Range or integer containment depends on a numeric multiple lattice that was not fully proven.",
        "Keep the target range and integer rule wide enough for the declared source multiple.",
      )])
    : constraintAnalysis(
        "number.constraints.changed",
        structuralStatus,
        previous,
        next,
        path,
        direction,
        "number range or integer requirement",
      );

  if (sourceMultiple === targetMultiple) return structuralAnalysis;

  const multipleAccepted = targetMultiple === undefined ||
    (sourceMultiple !== undefined && isExactDecimalMultiple(sourceMultiple, targetMultiple)) ||
    (sourceInteger && isExactDecimalMultiple(1, targetMultiple));
  const multipleStatus = multipleAccepted ? "safe" : "unknown";

  return combineAnalyses([
    structuralAnalysis,
    analysisFromFindings([createFinding(
      "number.multiple_of.changed",
      multipleStatus,
      path,
      direction,
      previous,
      next,
      multipleStatus === "safe"
        ? "Target multipleOf accepts every source value."
        : "multipleOf changed and decimal-lattice containment could not be proven.",
      multipleStatus === "unknown"
        ? "Keep the previous multipleOf or use a target divisor of the source multiple."
        : undefined,
    )]),
  ]);
}

function compareRecords(
  previous: Extract<ContractGraphNode, { readonly kind: "record" }>,
  next: Extract<ContractGraphNode, { readonly kind: "record" }>,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  context?: GraphComparisonContext,
): Analysis {
  const previousKey = Object.freeze({
    kind: "string" as const,
    ...(previous.key === undefined ? {} : { constraints: previous.key }),
  });
  const nextKey = Object.freeze({
    kind: "string" as const,
    ...(next.key === undefined ? {} : { constraints: next.key }),
  });

  return combineAnalyses([
    compareStringConstraints(previousKey, nextKey, [...path, "<key>"], direction),
    compareNodes(previous.value, next.value, [...path, "*"], direction, context),
  ]);
}

function compareArrays(
  previous: Extract<ContractGraphNode, { readonly kind: "array" }>,
  next: Extract<ContractGraphNode, { readonly kind: "array" }>,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  context?: GraphComparisonContext,
): Analysis {
  const source = direction === "backward" ? previous : next;
  const target = direction === "backward" ? next : previous;
  const sourceItemIsEmpty = isProvablyEmptyNode(source.item);
  const targetItemIsEmpty = isProvablyEmptyNode(target.item);
  const sourceMin = sourceItemIsEmpty ? 0 : source.constraints?.minLength ?? 0;
  const sourceMax = sourceItemIsEmpty ? 0 : source.constraints?.maxLength ?? Number.POSITIVE_INFINITY;
  const targetMin = targetItemIsEmpty ? 0 : target.constraints?.minLength ?? 0;
  const targetMax = targetItemIsEmpty ? 0 : target.constraints?.maxLength ?? Number.POSITIVE_INFINITY;
  const lengthContained = sourceMin >= targetMin && sourceMax <= targetMax;
  const zeroLengthCounterexample = sourceMin === 0 && targetMin > 0;
  const lengthStatus = lengthContained
    ? "safe"
    : zeroLengthCounterexample || isProvablyInhabitedNode(source.item)
      ? "breaking"
      : "unknown";
  const lengthAnalysis = sourceMin === targetMin && sourceMax === targetMax
    ? emptyAnalysis("safe")
    : lengthStatus === "unknown"
      ? analysisFromFindings([createFinding(
          "array.length.changed",
          "unknown",
          path,
          direction,
          previous,
          next,
          "Array length containment cannot be proven because a positive source length may be uninhabited.",
          "Keep the target length interval wide until item inhabitation is explicit.",
        )])
      : constraintAnalysis(
          "array.length.changed",
          lengthStatus,
          previous,
          next,
          path,
          direction,
          "array length",
        );

  return sourceMax === 0
    ? lengthAnalysis
    : combineAnalyses([
        lengthAnalysis,
        compareNodes(previous.item, next.item, [...path, "items"], direction, context),
      ]);
}

function constraintAnalysis(
  code: string,
  status: "safe" | "breaking",
  previous: ContractGraphNode,
  next: ContractGraphNode,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  label: string,
): Analysis {
  return analysisFromFindings([createFinding(
    code,
    status,
    path,
    direction,
    previous,
    next,
    status === "safe"
      ? `Target ${label} constraints accept every source value.`
      : `Target ${label} constraints reject some source values.`,
    status === "breaking" ? `Widen the target ${label} constraints during migration.` : undefined,
  )]);
}

function isIntegerOnly(constraints: NumberConstraints | undefined): boolean {
  if (constraints?.integer === true) return true;
  return constraints?.minimum !== undefined &&
    constraints.maximum !== undefined &&
    constraints.minimum === constraints.maximum &&
    Number.isInteger(constraints.minimum);
}

function effectiveNumberRange(
  constraints: NumberConstraints | undefined,
  integerOnly: boolean,
): { readonly minimum: number; readonly maximum: number } {
  const minimum = constraints?.minimum ?? Number.NEGATIVE_INFINITY;
  const maximum = constraints?.maximum ?? Number.POSITIVE_INFINITY;
  return integerOnly
    ? { minimum: Math.ceil(minimum), maximum: Math.floor(maximum) }
    : { minimum, maximum };
}

interface DecimalNumber {
  readonly coefficient: bigint;
  readonly scale: number;
}

function isExactDecimalMultiple(value: number, divisor: number): boolean {
  const left = decimalNumber(value);
  const right = decimalNumber(divisor);
  const scale = Math.max(left.scale, right.scale);
  const leftCoefficient = left.coefficient * (10n ** BigInt(scale - left.scale));
  const rightCoefficient = right.coefficient * (10n ** BigInt(scale - right.scale));
  return leftCoefficient % rightCoefficient === 0n;
}

function decimalNumber(value: number): DecimalNumber {
  const [mantissa = "0", exponentText] = Math.abs(value).toString().toLowerCase().split("e");
  const exponent = exponentText === undefined ? 0 : Number(exponentText);
  const [integer = "0", fraction = ""] = mantissa.split(".");
  const digits = `${integer}${fraction}`.replace(/^0+(?=\d)/u, "");
  const decimalPlaces = fraction.length - exponent;
  const coefficient = BigInt(digits) * (value < 0 ? -1n : 1n);

  return decimalPlaces > 0
    ? { coefficient, scale: decimalPlaces }
    : { coefficient: coefficient * (10n ** BigInt(-decimalPlaces)), scale: 0 };
}

function compareTuples(
  previous: Extract<ContractGraphNode, { readonly kind: "tuple" }>,
  next: Extract<ContractGraphNode, { readonly kind: "tuple" }>,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  context?: GraphComparisonContext,
): Analysis {
  if (previous.items.length !== next.items.length) {
    const source = direction === "backward" ? previous : next;
    const status = isProvablyInhabitedNode(source) ? "breaking" : "unknown";
    return analysisFromFindings([createFinding(
      "tuple.length.changed",
      status,
      path,
      direction,
      previous,
      next,
      status === "breaking"
        ? `Tuple length changed from ${previous.items.length} to ${next.items.length}.`
        : "Tuple lengths differ, but source inhabitation cannot be proven.",
      "Keep the tuple length stable or introduce a separately versioned contract.",
    )]);
  }

  return combineAnalyses(previous.items.map((item, index) =>
    compareNodes(item, next.items[index]!, [...path, index], direction, context)));
}

function compareTupleArrayRelationship(
  previous: ContractGraphNode,
  next: ContractGraphNode,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  context?: GraphComparisonContext,
): Analysis {
  const source = direction === "backward" ? previous : next;
  const target = direction === "backward" ? next : previous;

  if (source.kind === "tuple" && target.kind === "array") {
    const targetMin = target.constraints?.minLength ?? 0;
    const targetMax = target.constraints?.maxLength ?? Number.POSITIVE_INFINITY;
    const lengthAccepted = source.items.length >= targetMin && source.items.length <= targetMax;
    const lengthAnalysis = analysisFromFindings([createFinding(
      "tuple.array.changed",
      lengthAccepted ? "safe" : "breaking",
      path,
      direction,
      previous,
      next,
      lengthAccepted
        ? "Target array length constraints accept the source tuple length."
        : "Target array length constraints reject the source tuple length.",
      lengthAccepted ? undefined : "Widen the target array length interval.",
    )]);

    return combineAnalyses([
      lengthAnalysis,
      ...source.items.map((item, index) => compareSourceToTarget(
        item,
        target.item,
        [...path, index],
        direction,
        context,
      )),
    ]);
  }

  if (source.kind !== "array" || target.kind !== "tuple") {
    return emptyAnalysis("unknown");
  }

  const declaredSourceMin = source.constraints?.minLength ?? 0;
  const declaredSourceMax = source.constraints?.maxLength ?? Number.POSITIVE_INFINITY;
  const itemIsEmpty = isProvablyEmptyNode(source.item);
  const sourceMin = itemIsEmpty ? 0 : declaredSourceMin;
  const sourceMax = itemIsEmpty ? 0 : declaredSourceMax;
  const targetLength = target.items.length;
  const exactLength = sourceMin === targetLength && sourceMax === targetLength;

  if (!exactLength) {
    const zeroLengthCounterexample = sourceMin === 0 && targetLength !== 0;
    const inhabitedItemCounterexample = isProvablyInhabitedNode(source.item) &&
      (sourceMin !== targetLength || sourceMax !== targetLength);
    const status = zeroLengthCounterexample || inhabitedItemCounterexample
      ? "breaking"
      : "unknown";

    return analysisFromFindings([createFinding(
      "tuple.array.changed",
      status,
      path,
      direction,
      previous,
      next,
      status === "breaking"
        ? "The source array accepts a length rejected by the target tuple."
        : "Array-to-tuple containment cannot be proven because an alternative length may be uninhabited.",
      "Constrain the source array to the exact target tuple length.",
    )]);
  }

  return combineAnalyses([
    analysisFromFindings([createFinding(
      "tuple.array.changed",
      "safe",
      path,
      direction,
      previous,
      next,
      "The source array is constrained to the target tuple length.",
    )]),
    ...target.items.map((item, index) => compareSourceToTarget(
      source.item,
      item,
      [...path, index],
      direction,
      context,
    )),
  ]);
}

function compareSourceToTarget(
  source: ContractGraphNode,
  target: ContractGraphNode,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  context?: GraphComparisonContext,
): Analysis {
  return direction === "backward"
    ? compareNodes(source, target, path, direction, context)
    : compareNodes(target, source, path, direction, context);
}

function compareEnumRelationship(
  previous: ContractGraphNode,
  next: ContractGraphNode,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
): Analysis {
  const source = direction === "backward" ? previous : next;
  const target = direction === "backward" ? next : previous;

  if (source.kind !== "enum") {
    return kindChange(
      previous,
      next,
      path,
      direction,
      "unknown",
      "Containment of a non-finite source by an enum target cannot be proven.",
    );
  }

  if (!isLiteralAcceptanceDecidable(target)) {
    return analysisFromFindings([createFinding(
      "enum.values.changed",
      "unknown",
      path,
      direction,
      previous,
      next,
      "Target behavior is opaque, so enum containment cannot be proven.",
      "Use native constraints or stable unchanged opaque behavior before approving the migration.",
    )]);
  }

  const rejectedValues = source.values.filter((value) => !nodeAcceptsLiteral(target, value));
  const status = rejectedValues.length === 0 ? "safe" : "breaking";

  return analysisFromFindings([createFinding(
    "enum.values.changed",
    status,
    path,
    direction,
    previous,
    next,
    status === "safe"
      ? "Every source enum value is accepted by the target contract."
      : `Target contract rejects ${rejectedValues.length} source enum value${rejectedValues.length === 1 ? "" : "s"}.`,
    status === "breaking"
      ? "Keep every source enum value accepted during the compatibility window."
      : undefined,
  )]);
}

function compareObjects(
  previous: Extract<ContractGraphNode, { readonly kind: "object" }>,
  next: Extract<ContractGraphNode, { readonly kind: "object" }>,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  context?: GraphComparisonContext,
): Analysis {
  const source = direction === "backward" ? previous : next;
  const target = direction === "backward" ? next : previous;
  const previousRequired = new Set(previous.required);
  const nextRequired = new Set(next.required);
  const sourceRequired = direction === "backward" ? previousRequired : nextRequired;
  const targetRequired = direction === "backward" ? nextRequired : previousRequired;
  const analyses: Analysis[] = [compareUnknownPropertyPolicies(
    previous,
    next,
    path,
    direction,
  )];
  const keys = [...new Set([...Object.keys(previous.shape), ...Object.keys(next.shape)])].sort();

  for (const key of keys) {
    const previousProperty = previous.shape[key];
    const nextProperty = next.shape[key];
    const sourceProperty = source.shape[key];
    const targetProperty = target.shape[key];
    const propertyPath = [...path, key];

    if (sourceProperty === undefined && targetProperty !== undefined) {
      const required = targetRequired.has(key);
      const status = required
        ? "breaking"
        : source.unknownProperties === "reject"
          ? "safe"
          : source.unknownProperties === "strip"
            ? "breaking"
            : isProvablyUniversalIdentityNode(targetProperty)
              ? "safe"
              : isProvablyNonUniversalInputNode(targetProperty)
                ? "breaking"
                : "unknown";
      analyses.push(analysisFromFindings([createFinding(
        previousProperty === undefined ? `object.property.added.${required ? "required" : "optional"}` : "object.property.removed",
        status,
        propertyPath,
        direction,
        previousProperty ?? null,
        nextProperty ?? null,
        required
          ? `Target contract requires property "${key}" that source values do not contain.`
          : status === "safe"
            ? `Target contract adds optional property "${key}" and still accepts source values.`
            : status === "breaking"
              ? source.unknownProperties === "strip"
                ? `Source strips arbitrary "${key}" values, while the target declares and emits the property.`
                : `Source permits arbitrary "${key}" values that the target property rejects.`
              : `Source permits arbitrary "${key}" values and target containment or output identity cannot be proven.`,
        required
          ? `Make "${key}" optional during the compatibility window.`
          : status === "unknown"
            ? `Keep "${key}" outside the declared shape until permissive producers are migrated.`
            : undefined,
      )]));
      continue;
    }

    if (sourceProperty !== undefined && targetProperty === undefined) {
      const status = target.unknownProperties === "reject" || target.unknownProperties === "strip"
        ? "breaking"
        : isProvablyIdentityNode(sourceProperty)
          ? "safe"
          : "unknown";
      analyses.push(analysisFromFindings([createFinding(
        previousProperty === undefined ? "object.property.added.optional" : "object.property.removed",
        status,
        propertyPath,
        direction,
        previousProperty ?? null,
        nextProperty ?? null,
        target.unknownProperties === "reject"
          ? `Target rejecting object rejects source values that contain property "${key}".`
          : target.unknownProperties === "strip"
            ? `Target object strips property "${key}" from parsed output.`
            : status === "safe"
              ? `Target passthrough object preserves every source "${key}" value unchanged.`
              : `Target object preserves "${key}" without a proof that its previous parsed output was identical.`,
        status === "safe"
          ? undefined
          : `Keep "${key}" declared until producers and consumers have migrated.`,
      )]));
      continue;
    }

    if (sourceProperty === undefined || targetProperty === undefined || previousProperty === undefined || nextProperty === undefined) {
      continue;
    }

    const isSourceRequired = sourceRequired.has(key);
    const isTargetRequired = targetRequired.has(key);
    if (!isSourceRequired && isTargetRequired) {
      analyses.push(analysisFromFindings([createFinding(
        "object.property.requiredness.changed",
        "breaking",
        propertyPath,
        direction,
        previousProperty,
        nextProperty,
        `Property "${key}" is optional in source values but required by the target contract.`,
        `Keep "${key}" optional during the compatibility window.`,
      )]));
    } else if (isSourceRequired && !isTargetRequired) {
      analyses.push(analysisFromFindings([createFinding(
        "object.property.requiredness.changed",
        "safe",
        propertyPath,
        direction,
        previousProperty,
        nextProperty,
        `Target contract makes property "${key}" optional and still accepts source values.`,
      )]));
    }

    analyses.push(compareNodes(
      unwrapObjectProperty(previousProperty),
      unwrapObjectProperty(nextProperty),
      propertyPath,
      direction,
      context,
    ));
  }

  return combineAnalyses(analyses);
}

function compareUnknownPropertyPolicies(
  previous: Extract<ContractGraphNode, { readonly kind: "object" }>,
  next: Extract<ContractGraphNode, { readonly kind: "object" }>,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
): Analysis {
  if (previous.unknownProperties === next.unknownProperties) return emptyAnalysis("safe");

  const source = direction === "backward" ? previous : next;
  const target = direction === "backward" ? next : previous;
  const status = source.unknownProperties === "reject" ? "safe" : "breaking";

  return analysisFromFindings([createFinding(
    "object.unknown_properties.changed",
    status,
    path,
    direction,
    previous,
    next,
    status === "safe"
      ? `Target ${target.unknownProperties} policy accepts every source object.`
      : (source.unknownProperties === "strip" && target.unknownProperties === "passthrough") ||
          (source.unknownProperties === "passthrough" && target.unknownProperties === "strip")
        ? "Changing between strip and passthrough changes parsed output for extra properties."
        : `Target reject policy rejects extra properties accepted by source ${source.unknownProperties}.`,
    status === "breaking"
      ? "Keep the previous unknown-property policy during the compatibility window."
      : undefined,
  )]);
}

function compareUnionRelationship(
  previous: ContractGraphNode,
  next: ContractGraphNode,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  context?: GraphComparisonContext,
): Analysis {
  const source = direction === "backward" ? previous : next;
  const target = direction === "backward" ? next : previous;
  const sourceChoices = expandChoices(source);
  const targetChoices = expandChoices(target);
  const statuses = sourceChoices.map((sourceChoice) => {
    const candidates = targetChoices.map((targetChoice) => {
      const candidatePrevious = direction === "backward" ? sourceChoice : targetChoice;
      const candidateNext = direction === "backward" ? targetChoice : sourceChoice;
      return compareNodes(candidatePrevious, candidateNext, path, direction, context).status;
    });
    return candidates.some(isCompatibleStatus)
      ? "safe"
      : targetChoices.length > 1 && sourceChoice.kind !== "literal"
        ? isProvablyInhabitedNode(sourceChoice) && targetChoices.every((targetChoice) =>
            areProvablyDisjoint(sourceChoice, targetChoice))
          ? "breaking"
          : "unknown"
        : candidates.includes("unknown") || candidates.includes("risky")
        ? "unknown"
        : "breaking";
  });
  const status = aggregateStatus(statuses);

  if (status === "safe") {
    return analysisFromFindings([createFinding(
      "union.choices.changed",
      "safe",
      path,
      direction,
      previous,
      next,
      "Every source union choice is accepted by the target contract.",
    )]);
  }

  return analysisFromFindings([createFinding(
    "union.choices.changed",
    status,
    path,
    direction,
    previous,
    next,
    status === "unknown"
      ? "Union compatibility cannot be proven because no single target choice contains at least one non-finite or opaque source choice."
      : "At least one source union choice is not accepted by the target contract.",
    "Keep the previous choice during migration or version the contract.",
  )]);
}

function expandChoices(node: ContractGraphNode): readonly ContractGraphNode[] {
  if (node.kind === "union") {
    return Object.freeze(node.choices.flatMap(expandChoices));
  }

  if (node.kind === "nullable") {
    return Object.freeze([
      ...expandChoices(node.inner),
      Object.freeze({ kind: "literal", value: null }) as ContractGraphNode,
    ]);
  }

  if (node.kind === "optional") {
    return Object.freeze([
      ...expandChoices(node.inner),
      Object.freeze({
        kind: "literal",
        value: Object.freeze({ $safeShape: "undefined" }),
      }) as ContractGraphNode,
    ]);
  }

  if (node.kind === "enum" && (node.refinements ?? []).length === 0) {
    return Object.freeze(node.values.map((value) => Object.freeze({
      kind: "literal" as const,
      value,
    })));
  }

  return Object.freeze([node]);
}

function compareOpaque(
  previous: ContractGraphNode,
  next: ContractGraphNode,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
): GraphCompatibilityFinding | undefined {
  const previousRefinements = previous.refinements ?? [];
  const nextRefinements = next.refinements ?? [];

  if (canonicalStringify(previousRefinements) !== canonicalStringify(nextRefinements)) {
    return createFinding(
      "opaque.refinement.changed",
      "unknown",
      path,
      direction,
      previous,
      next,
      "Refinement behavior changed and cannot be compared structurally.",
      "Use a stable refinement id and change it whenever contract semantics change.",
    );
  }

  if (previous.kind === "transform" || next.kind === "transform") {
    if (previous.kind !== "transform" || next.kind !== "transform" || previous.id !== next.id) {
      return createFinding(
        "opaque.transform.changed",
        "unknown",
        path,
        direction,
        previous,
        next,
        "Transform behavior changed and cannot be compared structurally.",
        "Use the same stable transform id only while its contract semantics remain unchanged.",
      );
    }
  }

  if (previous.kind === "opaque" || next.kind === "opaque") {
    if (previous.kind === "opaque" && next.kind === "opaque" &&
        previous.behavior === next.behavior && previous.id !== null && previous.id === next.id) {
      return undefined;
    }
    return createFinding(
      (previous.kind === "opaque" && previous.id === null) ||
        (next.kind === "opaque" && next.id === null)
        ? "opaque.transform.anonymous"
        : "opaque.transform.changed",
      "unknown",
      path,
      direction,
      previous,
      next,
      "Opaque transform output behavior cannot be compared structurally.",
      "Use the same stable transform id only while output semantics remain unchanged.",
    );
  }

  return undefined;
}

function findAnonymousOpaque(
  previous: ContractGraphNode,
  next: ContractGraphNode,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
): readonly GraphCompatibilityFinding[] {
  const findings: GraphCompatibilityFinding[] = [];

  if ((previous.refinements ?? []).includes(null) || (next.refinements ?? []).includes(null)) {
    findings.push(createFinding(
      "opaque.refinement.anonymous",
      "unknown",
      path,
      direction,
      previous,
      next,
      "Anonymous refinement semantics cannot be verified from snapshots.",
      "Assign the refinement a stable id and change it whenever its contract semantics change.",
    ));
  }

  if ((previous.kind === "transform" && previous.id === null) || (next.kind === "transform" && next.id === null)) {
    findings.push(createFinding(
      "opaque.transform.anonymous",
      "unknown",
      path,
      direction,
      previous,
      next,
      "Anonymous transform semantics cannot be verified from snapshots.",
      "Assign the transform a stable id and change it whenever its contract semantics change.",
    ));
  }

  if ((previous.kind === "opaque" && previous.id === null) || (next.kind === "opaque" && next.id === null)) {
    findings.push(createFinding(
      "opaque.transform.anonymous",
      "unknown",
      path,
      direction,
      previous,
      next,
      "Anonymous opaque transform output cannot be verified from snapshots.",
      "Assign the transform a stable id and change it whenever output semantics change.",
    ));
  }

  if (previous.kind !== next.kind) {
    return Object.freeze(findings);
  }

  switch (previous.kind) {
    case "array": {
      const nextNode = next as Extract<ContractGraphNode, { readonly kind: "array" }>;
      findings.push(...findAnonymousOpaque(previous.item, nextNode.item, [...path, "items"], direction));
      break;
    }
    case "tuple": {
      const nextNode = next as Extract<ContractGraphNode, { readonly kind: "tuple" }>;
      previous.items.slice(0, nextNode.items.length).forEach((item, index) => {
        findings.push(...findAnonymousOpaque(item, nextNode.items[index]!, [...path, index], direction));
      });
      break;
    }
    case "union": {
      const nextNode = next as Extract<ContractGraphNode, { readonly kind: "union" }>;
      previous.choices.slice(0, nextNode.choices.length).forEach((choice, index) => {
        findings.push(...findAnonymousOpaque(choice, nextNode.choices[index]!, [...path, "choices", index], direction));
      });
      break;
    }
    case "discriminatedUnion": {
      const nextNode = next as Extract<ContractGraphNode, { readonly kind: "discriminatedUnion" }>;
      previous.choices.slice(0, nextNode.choices.length).forEach((choice, index) => {
        findings.push(...findAnonymousOpaque(
          choice,
          nextNode.choices[index]!,
          [...path, "choices", index],
          direction,
        ));
      });
      break;
    }
    case "intersection": {
      const nextNode = next as Extract<ContractGraphNode, { readonly kind: "intersection" }>;
      findings.push(...findAnonymousOpaque(previous.left, nextNode.left, [...path, "left"], direction));
      findings.push(...findAnonymousOpaque(previous.right, nextNode.right, [...path, "right"], direction));
      break;
    }
    case "object": {
      const nextNode = next as Extract<ContractGraphNode, { readonly kind: "object" }>;
      for (const key of Object.keys(previous.shape)) {
        const nextProperty = nextNode.shape[key];
        if (nextProperty !== undefined) {
          findings.push(...findAnonymousOpaque(previous.shape[key]!, nextProperty, [...path, key], direction));
        }
      }
      break;
    }
    case "record": {
      const nextNode = next as Extract<ContractGraphNode, { readonly kind: "record" }>;
      findings.push(...findAnonymousOpaque(previous.value, nextNode.value, [...path, "*"], direction));
      break;
    }
    case "nullable":
    case "optional":
    case "transform":
      findings.push(...findAnonymousOpaque(
        previous.inner,
        (next as Extract<ContractGraphNode, { readonly kind: typeof previous.kind }>).inner,
        path,
        direction,
      ));
      break;
    case "string":
    case "number":
    case "boolean":
    case "literal":
    case "enum":
    case "unknown":
    case "never":
    case "reference":
    case "opaque":
      break;
  }

  return Object.freeze(findings);
}

function definitionToContract(definition: SchemaDefinition): ContractNode {
  const common = definitionCommon(definition);

  switch (definition.kind) {
    case "string":
      return Object.freeze({
        kind: definition.kind,
        ...copyConstraints(definition.constraints),
        ...common,
      });
    case "number":
      return Object.freeze({
        kind: definition.kind,
        ...copyConstraints(definition.constraints),
        ...common,
      });
    case "boolean":
      return Object.freeze({ kind: definition.kind, ...common });
    case "literal":
      return Object.freeze({ kind: "literal", value: encodeLiteral(definition.value), ...common });
    case "enum":
      return Object.freeze({
        kind: "enum",
        values: canonicalizeContractEnumValues(definition.values),
        ...common,
      });
    case "unknown":
      return Object.freeze({ kind: "unknown", ...common });
    case "never":
      return Object.freeze({ kind: "never", ...common });
    case "array":
      return Object.freeze({
        kind: "array",
        item: definitionToContract(definition.item),
        ...copyConstraints(definition.constraints),
        ...common,
      });
    case "tuple":
      return Object.freeze({
        kind: "tuple",
        items: Object.freeze(definition.items.map(definitionToContract)),
        ...common,
      });
    case "union":
      return Object.freeze({
        kind: "union",
        choices: Object.freeze(definition.choices.map(definitionToContract)),
        ...common,
      });
    case "discriminatedUnion":
      return Object.freeze({
        kind: "discriminatedUnion",
        discriminator: definition.discriminator,
        choices: Object.freeze(definition.choices.map(definitionToContract)),
        ...common,
      });
    case "intersection":
      return Object.freeze({
        kind: "intersection",
        left: definitionToContract(definition.left),
        right: definitionToContract(definition.right),
        ...common,
      });
    case "object": {
      const shape: Record<string, ContractNode> = {};
      for (const key of Object.keys(definition.shape).sort()) {
        shape[key] = definitionToContract(definition.shape[key]!);
      }
      return Object.freeze({
        kind: "object",
        shape: Object.freeze(shape),
        required: Object.freeze([...definition.required].sort()),
        unknownProperties: definition.unknownProperties,
        ...common,
      });
    }
    case "record":
      return Object.freeze({
        kind: "record",
        value: definitionToContract(definition.value),
        ...(definition.key === undefined ? {} : { key: Object.freeze({ ...definition.key }) }),
        ...common,
      });
    case "nullable":
      return Object.freeze({ kind: "nullable", inner: definitionToContract(definition.inner), ...common });
    case "optional":
      return Object.freeze({ kind: "optional", inner: definitionToContract(definition.inner), ...common });
    case "transform":
      return Object.freeze({
        kind: "transform",
        inner: definitionToContract(definition.inner),
        id: definition.id ?? null,
        ...common,
      });
    case "reference":
      throw new TypeError(
        "Contract snapshot v1 cannot represent schema references. Use createContractSnapshotV2() for graph contracts.",
      );
    case "opaque":
      throw new TypeError(
        "Contract snapshot v1 cannot represent an opaque output contract.",
      );
  }
}

function definitionGraphToSnapshot(graph: SchemaContractGraph): ContractGraphSnapshot {
  const definitions: Record<string, ContractGraphNode> = {};

  for (const id of Object.keys(graph.definitions).sort()) {
    defineRecordValue(definitions, id, definitionToGraphNode(graph.definitions[id]!));
  }

  const root = definitionToGraphNode(graph.root);
  const frozenDefinitions = Object.freeze(definitions);
  validateContractGraph(root, frozenDefinitions, "contract");

  return Object.freeze({
    fingerprint: fingerprintContractGraph(root, frozenDefinitions),
    root,
    definitions: frozenDefinitions,
  });
}

function definitionToGraphNode(definition: SchemaDefinition): ContractGraphNode {
  const common = definitionCommon(definition);

  switch (definition.kind) {
    case "string":
      return Object.freeze({
        kind: definition.kind,
        ...copyConstraints(definition.constraints),
        ...common,
      });
    case "number":
      return Object.freeze({
        kind: definition.kind,
        ...copyConstraints(definition.constraints),
        ...common,
      });
    case "boolean":
      return Object.freeze({ kind: definition.kind, ...common });
    case "literal":
      return Object.freeze({ kind: "literal", value: encodeLiteral(definition.value), ...common });
    case "enum":
      return Object.freeze({
        kind: "enum",
        values: canonicalizeContractEnumValues(definition.values),
        ...common,
      });
    case "unknown":
      return Object.freeze({ kind: "unknown", ...common });
    case "never":
      return Object.freeze({ kind: "never", ...common });
    case "array":
      return Object.freeze({
        kind: "array",
        item: definitionToGraphNode(definition.item),
        ...copyConstraints(definition.constraints),
        ...common,
      });
    case "tuple":
      return Object.freeze({
        kind: "tuple",
        items: Object.freeze(definition.items.map(definitionToGraphNode)),
        ...common,
      });
    case "union":
      return Object.freeze({
        kind: "union",
        choices: Object.freeze(definition.choices.map(definitionToGraphNode)),
        ...common,
      });
    case "discriminatedUnion":
      return Object.freeze({
        kind: "discriminatedUnion",
        discriminator: definition.discriminator,
        choices: Object.freeze(definition.choices.map(definitionToGraphNode)),
        ...common,
      });
    case "intersection":
      return Object.freeze({
        kind: "intersection",
        left: definitionToGraphNode(definition.left),
        right: definitionToGraphNode(definition.right),
        ...common,
      });
    case "object": {
      const shape: Record<string, ContractGraphNode> = {};
      for (const key of Object.keys(definition.shape).sort()) {
        defineRecordValue(shape, key, definitionToGraphNode(definition.shape[key]!));
      }
      return Object.freeze({
        kind: "object",
        shape: Object.freeze(shape),
        required: Object.freeze([...definition.required].sort()),
        unknownProperties: definition.unknownProperties,
        ...common,
      });
    }
    case "record":
      return Object.freeze({
        kind: "record",
        value: definitionToGraphNode(definition.value),
        ...(definition.key === undefined ? {} : { key: Object.freeze({ ...definition.key }) }),
        ...common,
      });
    case "nullable":
      return Object.freeze({ kind: "nullable", inner: definitionToGraphNode(definition.inner), ...common });
    case "optional":
      return Object.freeze({ kind: "optional", inner: definitionToGraphNode(definition.inner), ...common });
    case "transform":
      return Object.freeze({
        kind: "transform",
        inner: definitionToGraphNode(definition.inner),
        id: definition.id ?? null,
        ...common,
      });
    case "reference":
      return Object.freeze({ kind: "reference", id: definition.id, ...common });
    case "opaque":
      return Object.freeze({
        kind: "opaque",
        behavior: definition.behavior,
        id: definition.id ?? null,
        ...common,
      });
  }
}

function copyConstraints<TConstraints extends object>(
  constraints: TConstraints | undefined,
): { readonly constraints?: TConstraints } {
  return constraints === undefined
    ? {}
    : { constraints: Object.freeze({ ...constraints }) as TConstraints };
}

function definitionCommon(definition: SchemaDefinition): Pick<ContractNodeBase, "metadata" | "refinements"> {
  const metadata = definition.metadata === undefined
    ? undefined
    : Object.freeze({
        ...(definition.metadata.title === undefined ? {} : { title: definition.metadata.title }),
        ...(definition.metadata.description === undefined ? {} : { description: definition.metadata.description }),
      });
  return {
    ...(metadata === undefined || Object.keys(metadata).length === 0 ? {} : { metadata }),
    ...(definition.refinements === undefined
      ? {}
      : { refinements: Object.freeze([...definition.refinements]) }),
  };
}

function encodeLiteral(value: unknown): ContractLiteralValue {
  if (value === undefined) return Object.freeze({ $safeShape: "undefined" });
  if (typeof value === "number") {
    if (Number.isNaN(value)) return Object.freeze({ $safeShape: "nan" });
    if (value === Number.POSITIVE_INFINITY) return Object.freeze({ $safeShape: "infinity" });
    if (value === Number.NEGATIVE_INFINITY) return Object.freeze({ $safeShape: "-infinity" });
    if (Object.is(value, -0)) return Object.freeze({ $safeShape: "-0" });
  }
  return value as string | number | boolean | null;
}

function fingerprintContract(contract: ContractNode): string {
  return fingerprintValue(contract);
}

function fingerprintContractGraph(
  root: ContractGraphNode,
  definitions: Readonly<Record<string, ContractGraphNode>>,
): string {
  return fingerprintValue({ root, definitions });
}

function fingerprintContractGraphs(
  input: ContractGraphSnapshot,
  output: ContractGraphSnapshot,
): string {
  return fingerprintValue({
    input: { root: input.root, definitions: input.definitions },
    output: { root: output.root, definitions: output.definitions },
  });
}

function fingerprintValue(value: unknown): string {
  return `sha256:${createHash("sha256").update(canonicalStringify(value)).digest("hex")}`;
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!isRecord(value)) return value;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    defineRecordValue(result, key, sortJsonValue(value[key]));
  }
  return result;
}

function stripGraphMetadata(graph: ContractGraphSnapshot): unknown {
  return {
    root: stripMetadata(graph.root),
    definitions: Object.fromEntries(Object.entries(graph.definitions).map(([id, definition]) =>
      [id, stripMetadata(definition)])),
  };
}

function stripMetadata(node: ContractGraphNode): unknown {
  const record = { ...node } as Record<string, unknown>;
  delete record.metadata;
  for (const [key, value] of Object.entries(record)) {
    if (Array.isArray(value)) record[key] = value.map((item) => isContractNode(item) ? stripMetadata(item) : item);
    else if (isContractNode(value)) record[key] = stripMetadata(value);
    else if (key === "shape" && isRecord(value)) {
      record[key] = Object.fromEntries(Object.entries(value).map(([name, child]) =>
        [name, stripMetadata(child as ContractGraphNode)]));
    }
  }
  return record;
}

function parseContractNode(value: unknown, path: string): ContractNode {
  const record = expectRecord(value, path);
  const kind = expectString(record.kind, `${path}.kind`);
  const common = parseCommon(record, path);

  switch (kind) {
    case "string":
      return Object.freeze({
        kind,
        ...parseStringConstraints(record.constraints, `${path}.constraints`),
        ...common,
      });
    case "number":
      return Object.freeze({
        kind,
        ...parseNumberConstraints(record.constraints, `${path}.constraints`),
        ...common,
      });
    case "boolean":
      return Object.freeze({ kind, ...common });
    case "literal":
      return Object.freeze({ kind, value: parseLiteral(record.value, `${path}.value`), ...common });
    case "enum":
      return Object.freeze({
        kind,
        values: parseEnumValues(record.values, `${path}.values`),
        ...common,
      });
    case "unknown":
      return Object.freeze({ kind, ...common });
    case "never":
      return Object.freeze({ kind, ...common });
    case "array":
      return Object.freeze({
        kind,
        item: parseContractNode(record.item, `${path}.item`),
        ...parseLengthConstraints(record.constraints, `${path}.constraints`),
        ...common,
      });
    case "tuple":
      return Object.freeze({ kind, items: parseNodeArray(record.items, `${path}.items`), ...common });
    case "union":
      return Object.freeze({ kind, choices: parseNodeArray(record.choices, `${path}.choices`), ...common });
    case "discriminatedUnion": {
      const discriminator = expectString(record.discriminator, `${path}.discriminator`);
      const choices = parseNodeArray(record.choices, `${path}.choices`);
      validateDiscriminatedUnionChoices(discriminator, choices, path);
      return Object.freeze({ kind, discriminator, choices, ...common });
    }
    case "intersection":
      return Object.freeze({
        kind,
        left: parseContractNode(record.left, `${path}.left`),
        right: parseContractNode(record.right, `${path}.right`),
        ...common,
      });
    case "object": {
      const unknownProperties = parseUnknownPropertyPolicy(
        record.unknownProperties,
        `${path}.unknownProperties`,
      );
      const shapeRecord = expectRecord(record.shape, `${path}.shape`);
      const shape: Record<string, ContractNode> = {};
      for (const key of Object.keys(shapeRecord).sort()) shape[key] = parseContractNode(shapeRecord[key], `${path}.shape.${key}`);
      if (!Array.isArray(record.required)) throw new TypeError(`${path}.required must be an array.`);
      const required = record.required.map((item, index) => expectString(item, `${path}.required[${index}]`)).sort();
      if (new Set(required).size !== required.length || required.some((key) => shape[key] === undefined)) {
        throw new TypeError(`${path}.required must contain unique keys from shape.`);
      }
      return Object.freeze({
        kind,
        shape: Object.freeze(shape),
        required: Object.freeze(required),
        unknownProperties,
        ...common,
      });
    }
    case "record":
      return Object.freeze({
        kind,
        value: parseContractNode(record.value, `${path}.value`),
        ...parseRecordKeyConstraints(record.key, `${path}.key`),
        ...common,
      });
    case "nullable":
    case "optional":
      return Object.freeze({ kind, inner: parseContractNode(record.inner, `${path}.inner`), ...common });
    case "transform":
      return Object.freeze({
        kind,
        inner: parseContractNode(record.inner, `${path}.inner`),
        id: record.id === null ? null : validateId(expectString(record.id, `${path}.id`)),
        ...common,
      });
    default:
      throw new TypeError(`Unsupported contract node kind at ${path}: ${kind}`);
  }
}

function parseContractGraphSnapshot(value: unknown, path: string): ContractGraphSnapshot {
  const record = expectRecord(value, path);
  const fingerprint = expectString(record.fingerprint, `${path}.fingerprint`);
  const root = parseContractGraphNode(record.root, `${path}.root`);
  const definitionsRecord = expectRecord(record.definitions, `${path}.definitions`);
  const definitions: Record<string, ContractGraphNode> = {};

  for (const id of Object.keys(definitionsRecord).sort()) {
    validateId(id);
    defineRecordValue(definitions, id, parseContractGraphNode(
      definitionsRecord[id],
      `${path}.definitions.${id}`,
    ));
  }

  const frozenDefinitions = Object.freeze(definitions);
  validateContractGraph(root, frozenDefinitions, path);
  const expectedFingerprint = fingerprintContractGraph(root, frozenDefinitions);

  if (fingerprint !== expectedFingerprint) {
    throw new TypeError(`${path}.fingerprint does not match its canonical graph.`);
  }

  return Object.freeze({ fingerprint, root, definitions: frozenDefinitions });
}

function parseContractGraphNode(value: unknown, path: string): ContractGraphNode {
  const record = expectRecord(value, path);
  const kind = expectString(record.kind, `${path}.kind`);
  const common = parseCommon(record, path);

  switch (kind) {
    case "string":
      return Object.freeze({
        kind,
        ...parseStringConstraints(record.constraints, `${path}.constraints`),
        ...common,
      });
    case "number":
      return Object.freeze({
        kind,
        ...parseNumberConstraints(record.constraints, `${path}.constraints`),
        ...common,
      });
    case "boolean":
      return Object.freeze({ kind, ...common });
    case "literal":
      return Object.freeze({ kind, value: parseLiteral(record.value, `${path}.value`), ...common });
    case "enum":
      return Object.freeze({
        kind,
        values: parseEnumValues(record.values, `${path}.values`),
        ...common,
      });
    case "unknown":
      return Object.freeze({ kind, ...common });
    case "never":
      return Object.freeze({ kind, ...common });
    case "array":
      return Object.freeze({
        kind,
        item: parseContractGraphNode(record.item, `${path}.item`),
        ...parseLengthConstraints(record.constraints, `${path}.constraints`),
        ...common,
      });
    case "tuple":
      return Object.freeze({
        kind,
        items: parseGraphNodeArray(record.items, `${path}.items`),
        ...common,
      });
    case "union":
      return Object.freeze({
        kind,
        choices: parseGraphNodeArray(record.choices, `${path}.choices`),
        ...common,
      });
    case "discriminatedUnion": {
      const discriminator = expectString(record.discriminator, `${path}.discriminator`);
      const choices = parseGraphNodeArray(record.choices, `${path}.choices`);
      validateDiscriminatedUnionChoices(discriminator, choices, path);
      return Object.freeze({ kind, discriminator, choices, ...common });
    }
    case "intersection":
      return Object.freeze({
        kind,
        left: parseContractGraphNode(record.left, `${path}.left`),
        right: parseContractGraphNode(record.right, `${path}.right`),
        ...common,
      });
    case "object": {
      const unknownProperties = parseUnknownPropertyPolicy(
        record.unknownProperties,
        `${path}.unknownProperties`,
      );
      const shapeRecord = expectRecord(record.shape, `${path}.shape`);
      const shape: Record<string, ContractGraphNode> = {};
      for (const key of Object.keys(shapeRecord).sort()) {
        defineRecordValue(
          shape,
          key,
          parseContractGraphNode(shapeRecord[key], `${path}.shape.${key}`),
        );
      }
      if (!Array.isArray(record.required)) throw new TypeError(`${path}.required must be an array.`);
      const required = record.required
        .map((item, index) => expectString(item, `${path}.required[${index}]`))
        .sort();
      if (new Set(required).size !== required.length || required.some((key) => shape[key] === undefined)) {
        throw new TypeError(`${path}.required must contain unique keys from shape.`);
      }
      return Object.freeze({
        kind,
        shape: Object.freeze(shape),
        required: Object.freeze(required),
        unknownProperties,
        ...common,
      });
    }
    case "record":
      return Object.freeze({
        kind,
        value: parseContractGraphNode(record.value, `${path}.value`),
        ...parseRecordKeyConstraints(record.key, `${path}.key`),
        ...common,
      });
    case "nullable":
    case "optional":
      return Object.freeze({
        kind,
        inner: parseContractGraphNode(record.inner, `${path}.inner`),
        ...common,
      });
    case "transform":
      return Object.freeze({
        kind,
        inner: parseContractGraphNode(record.inner, `${path}.inner`),
        id: record.id === null ? null : validateId(expectString(record.id, `${path}.id`)),
        ...common,
      });
    case "reference":
      return Object.freeze({
        kind,
        id: validateId(expectString(record.id, `${path}.id`)),
        ...common,
      });
    case "opaque":
      if (record.behavior !== "transform") {
        throw new TypeError(`${path}.behavior must be "transform".`);
      }
      return Object.freeze({
        kind,
        behavior: "transform",
        id: record.id === null ? null : validateId(expectString(record.id, `${path}.id`)),
        ...common,
      });
    default:
      throw new TypeError(`Unsupported contract graph node kind at ${path}: ${kind}`);
  }
}

function parseGraphNodeArray(value: unknown, path: string): readonly ContractGraphNode[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array.`);
  return Object.freeze(value.map((item, index) => parseContractGraphNode(item, `${path}[${index}]`)));
}

function validateContractGraph(
  root: ContractGraphNode,
  definitions: Readonly<Record<string, ContractGraphNode>>,
  path: string,
): void {
  const reachable = new Set<string>();

  const visit = (node: ContractGraphNode, nodePath: string): void => {
    switch (node.kind) {
      case "reference": {
        if (!Object.prototype.hasOwnProperty.call(definitions, node.id)) {
          throw new TypeError(`${nodePath}.id references missing definition "${node.id}".`);
        }
        const target = definitions[node.id]!;
        if (reachable.has(node.id)) return;
        reachable.add(node.id);
        visit(target, `${path}.definitions.${node.id}`);
        return;
      }
      case "array":
        visit(node.item, `${nodePath}.item`);
        return;
      case "tuple":
        node.items.forEach((item, index) => visit(item, `${nodePath}.items[${index}]`));
        return;
      case "union":
        node.choices.forEach((choice, index) => visit(choice, `${nodePath}.choices[${index}]`));
        return;
      case "discriminatedUnion":
        node.choices.forEach((choice, index) => visit(choice, `${nodePath}.choices[${index}]`));
        return;
      case "intersection":
        visit(node.left, `${nodePath}.left`);
        visit(node.right, `${nodePath}.right`);
        return;
      case "object":
        for (const key of Object.keys(node.shape)) visit(node.shape[key]!, `${nodePath}.shape.${key}`);
        return;
      case "record":
        visit(node.value, `${nodePath}.value`);
        return;
      case "nullable":
      case "optional":
      case "transform":
        visit(node.inner, `${nodePath}.inner`);
        return;
      case "string":
      case "number":
      case "boolean":
      case "literal":
      case "enum":
      case "unknown":
      case "never":
      case "opaque":
        return;
    }
  };

  visit(root, `${path}.root`);

  for (const id of Object.keys(definitions)) {
    if (!reachable.has(id)) {
      throw new TypeError(`${path}.definitions.${id} is not reachable from the graph root.`);
    }
  }
}

function parseLengthConstraints(
  value: unknown,
  path: string,
): { readonly constraints?: StringConstraints } {
  if (value === undefined) return {};
  const record = expectRecord(value, path);
  const minLength = optionalNumber(record.minLength, `${path}.minLength`);
  const maxLength = optionalNumber(record.maxLength, `${path}.maxLength`);
  if (minLength !== undefined) validateSnapshotLength(minLength, `${path}.minLength`);
  if (maxLength !== undefined) validateSnapshotLength(maxLength, `${path}.maxLength`);
  if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
    throw new TypeError(`${path}.minLength must not exceed maxLength.`);
  }
  return {
    constraints: Object.freeze({
      ...(minLength === undefined ? {} : { minLength }),
      ...(maxLength === undefined ? {} : { maxLength }),
    }),
  };
}

function parseStringConstraints(
  value: unknown,
  path: string,
): { readonly constraints?: StringConstraints } {
  const lengths = parseLengthConstraints(value, path);
  if (value === undefined) return lengths;
  const record = expectRecord(value, path);
  const pattern = record.pattern === undefined
    ? undefined
    : expectString(record.pattern, `${path}.pattern`);
  const format = record.format === undefined
    ? undefined
    : parseStringFormat(record.format, `${path}.format`);

  if (pattern !== undefined) {
    try {
      new RegExp(pattern, "u");
    } catch {
      throw new TypeError(`${path}.pattern must be a valid ECMAScript regular expression in Unicode mode.`);
    }
  }

  return {
    constraints: Object.freeze({
      ...(lengths.constraints ?? {}),
      ...(pattern === undefined ? {} : { pattern }),
      ...(format === undefined ? {} : { format }),
    }),
  };
}

function parseStringFormat(value: unknown, path: string): StringFormat {
  if (value === "email" || value === "uuid" || value === "date" || value === "date-time") {
    return value;
  }
  throw new TypeError(`${path} must be "email", "uuid", "date", or "date-time".`);
}

function parseUnknownPropertyPolicy(value: unknown, path: string): UnknownPropertyPolicy {
  if (value === "reject" || value === "strip" || value === "passthrough") return value;
  throw new TypeError(`${path} must be "reject", "strip", or "passthrough".`);
}

function parseRecordKeyConstraints(
  value: unknown,
  path: string,
): { readonly key?: StringConstraints } {
  const parsed = parseStringConstraints(value, path);
  return parsed.constraints === undefined ? {} : { key: parsed.constraints };
}

function parseNumberConstraints(
  value: unknown,
  path: string,
): { readonly constraints?: NumberConstraints } {
  if (value === undefined) return {};
  const record = expectRecord(value, path);
  const minimum = optionalNumber(record.minimum, `${path}.minimum`);
  const maximum = optionalNumber(record.maximum, `${path}.maximum`);
  const multipleOf = optionalNumber(record.multipleOf, `${path}.multipleOf`);
  if (minimum !== undefined && !Number.isFinite(minimum)) throw new TypeError(`${path}.minimum must be finite.`);
  if (maximum !== undefined && !Number.isFinite(maximum)) throw new TypeError(`${path}.maximum must be finite.`);
  if (multipleOf !== undefined && (!Number.isFinite(multipleOf) || multipleOf <= 0)) {
    throw new TypeError(`${path}.multipleOf must be a positive finite number.`);
  }
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    throw new TypeError(`${path}.minimum must not exceed maximum.`);
  }
  if (record.integer !== undefined && typeof record.integer !== "boolean") {
    throw new TypeError(`${path}.integer must be a boolean.`);
  }
  if (record.integer === true && minimum !== undefined && maximum !== undefined &&
      Math.ceil(minimum) > Math.floor(maximum)) {
    throw new TypeError(`${path} integer range must include at least one integer.`);
  }
  return {
    constraints: Object.freeze({
      ...(minimum === undefined ? {} : { minimum }),
      ...(maximum === undefined ? {} : { maximum }),
      ...(record.integer === undefined ? {} : { integer: record.integer }),
      ...(multipleOf === undefined ? {} : { multipleOf }),
    }),
  };
}

function optionalNumber(value: unknown, path: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "number") throw new TypeError(`${path} must be a number.`);
  return value;
}

function validateSnapshotLength(value: number, path: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${path} must be a non-negative safe integer.`);
  }
}

function parseCommon(record: Readonly<Record<string, unknown>>, path: string): Pick<ContractNodeBase, "metadata" | "refinements"> {
  let metadata: ContractMetadata | undefined;
  if (record.metadata !== undefined) {
    const raw = expectRecord(record.metadata, `${path}.metadata`);
    metadata = Object.freeze({
      ...(raw.title === undefined ? {} : { title: expectString(raw.title, `${path}.metadata.title`) }),
      ...(raw.description === undefined ? {} : { description: expectString(raw.description, `${path}.metadata.description`) }),
    });
  }

  let refinements: readonly (string | null)[] | undefined;
  if (record.refinements !== undefined) {
    if (!Array.isArray(record.refinements)) throw new TypeError(`${path}.refinements must be an array.`);
    refinements = Object.freeze(record.refinements.map((item, index) =>
      item === null ? null : validateId(expectString(item, `${path}.refinements[${index}]`))));
  }

  return {
    ...(metadata === undefined ? {} : { metadata }),
    ...(refinements === undefined ? {} : { refinements }),
  };
}

function parseNodeArray(value: unknown, path: string): readonly ContractNode[] {
  if (!Array.isArray(value)) throw new TypeError(`${path} must be an array.`);
  return Object.freeze(value.map((item, index) => parseContractNode(item, `${path}[${index}]`)));
}

function validateDiscriminatedUnionChoices(
  discriminator: string,
  choices: readonly (ContractNode | ContractGraphNode)[],
  path: string,
): void {
  if (choices.length === 0) {
    throw new TypeError(`${path}.choices must be a non-empty array.`);
  }

  const seen: (string | number)[] = [];
  choices.forEach((choice, index) => {
    const choicePath = `${path}.choices[${index}]`;
    if (choice.kind !== "object") {
      throw new TypeError(`${choicePath} must be an object node.`);
    }
    if (!choice.required.includes(discriminator)) {
      throw new TypeError(`${choicePath} must require discriminator ${JSON.stringify(discriminator)}.`);
    }

    const discriminatorNode = choice.shape[discriminator];
    const values = discriminatorNode?.kind === "enum"
      ? discriminatorNode.values
      : discriminatorNode?.kind === "literal" &&
          (typeof discriminatorNode.value === "string" ||
            (typeof discriminatorNode.value === "number" &&
              Number.isFinite(discriminatorNode.value) &&
              !Object.is(discriminatorNode.value, -0)))
        ? [discriminatorNode.value]
        : undefined;
    if (values === undefined) {
      throw new TypeError(
        `${choicePath}.shape.${discriminator} must be a string or finite-number literal or enum node.`,
      );
    }

    for (const value of values) {
      if (seen.some((existing) => Object.is(existing, value))) {
        throw new TypeError(`${path} discriminator values must be unique.`);
      }
      seen.push(value);
    }
  });
}

function parseEnumValues(value: unknown, path: string): readonly (string | number)[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError(`${path} must be a non-empty array.`);
  }

  const values: (string | number)[] = [];
  for (const [index, item] of value.entries()) {
    if (typeof item !== "string" && (typeof item !== "number" || !Number.isFinite(item))) {
      throw new TypeError(`${path}[${index}] must be a string or finite number.`);
    }
    if (typeof item === "number" && Object.is(item, -0)) {
      throw new TypeError(`${path}[${index}] must not be negative zero.`);
    }
    if (values.some((existing) => Object.is(existing, item))) {
      throw new TypeError(`${path} must contain unique values.`);
    }
    values.push(item);
  }

  return canonicalizeContractEnumValues(values);
}

function canonicalizeContractEnumValues(
  values: readonly (string | number)[],
): readonly (string | number)[] {
  return Object.freeze([...values].sort((left, right) => {
    if (typeof left !== typeof right) return typeof left === "string" ? -1 : 1;
    if (typeof left === "number" && typeof right === "number") return left - right;
    return left < right ? -1 : left > right ? 1 : 0;
  }));
}

function parseLiteral(value: unknown, path: string): ContractLiteralValue {
  if (value === null || typeof value === "string" || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) {
    return value;
  }
  const record = expectRecord(value, path);
  if (["undefined", "nan", "infinity", "-infinity", "-0"].includes(String(record.$safeShape))) {
    return Object.freeze({ $safeShape: record.$safeShape as SpecialLiteralValue["$safeShape"] });
  }
  throw new TypeError(`${path} is not a supported literal value.`);
}

function isProvablyEmptyNode(node: ContractGraphNode): boolean {
  switch (node.kind) {
    case "never":
      return true;
    case "number":
      return node.constraints?.integer === true &&
        Math.ceil(node.constraints.minimum ?? Number.NEGATIVE_INFINITY) >
          Math.floor(node.constraints.maximum ?? Number.POSITIVE_INFINITY);
    case "array":
      return (node.constraints?.minLength ?? 0) > 0 && isProvablyEmptyNode(node.item);
    case "tuple":
      return node.items.some(isProvablyEmptyNode);
    case "union":
    case "discriminatedUnion":
      return node.choices.every(isProvablyEmptyNode);
    case "intersection":
      return isProvablyEmptyNode(node.left) || isProvablyEmptyNode(node.right);
    case "object": {
      const required = new Set(node.required);
      return Object.entries(node.shape).some(([key, property]) =>
        required.has(key) && isProvablyEmptyNode(unwrapObjectProperty(property)));
    }
    case "transform":
      return isProvablyEmptyNode(node.inner);
    case "string":
    case "boolean":
    case "literal":
    case "enum":
    case "unknown":
    case "record":
    case "nullable":
    case "optional":
    case "reference":
    case "opaque":
      return false;
  }
}

function isProvablyInhabitedNode(node: ContractGraphNode): boolean {
  if ((node.refinements ?? []).length > 0) return false;

  switch (node.kind) {
    case "string":
      return node.constraints?.pattern === undefined &&
        node.constraints?.format === undefined &&
        (node.constraints?.minLength ?? 0) <= 1;
    case "number": {
      if (node.constraints?.multipleOf !== undefined) return false;
      if (node.constraints?.integer !== true) return true;
      const minimum = Math.ceil(node.constraints.minimum ?? Number.NEGATIVE_INFINITY);
      const maximum = Math.floor(node.constraints.maximum ?? Number.POSITIVE_INFINITY);
      return minimum <= maximum;
    }
    case "boolean":
    case "literal":
    case "enum":
    case "unknown":
    case "record":
      return true;
    case "never":
      return false;
    case "array":
      return (node.constraints?.minLength ?? 0) === 0 || isProvablyInhabitedNode(node.item);
    case "tuple":
      return node.items.every(isProvablyInhabitedNode);
    case "union":
    case "discriminatedUnion":
      return node.choices.some(isProvablyInhabitedNode);
    case "intersection":
      return false;
    case "object": {
      const required = new Set(node.required);
      return Object.entries(node.shape).every(([key, property]) =>
        !required.has(key) || isProvablyInhabitedNode(unwrapObjectProperty(property)));
    }
    case "nullable":
    case "optional":
      return true;
    case "transform":
    case "reference":
    case "opaque":
      return false;
  }
}

function isProvablyUniversalIdentityNode(node: ContractGraphNode): boolean {
  if ((node.refinements ?? []).length > 0) return false;

  switch (node.kind) {
    case "unknown":
      return true;
    case "nullable":
    case "optional":
      return isProvablyUniversalIdentityNode(node.inner);
    case "union":
      return node.choices.every(isProvablyIdentityNode) &&
        node.choices.some(isProvablyUniversalIdentityNode);
    case "string":
    case "number":
    case "boolean":
    case "literal":
    case "enum":
    case "never":
    case "array":
    case "tuple":
    case "discriminatedUnion":
    case "intersection":
    case "object":
    case "record":
    case "transform":
    case "reference":
    case "opaque":
      return false;
  }
}

function isProvablyNonUniversalInputNode(node: ContractGraphNode): boolean {
  switch (node.kind) {
    case "unknown":
      return false;
    case "nullable":
    case "optional":
    case "transform":
      return isProvablyNonUniversalInputNode(node.inner);
    case "union":
    case "discriminatedUnion":
      return node.choices.every(isProvablyNonUniversalInputNode);
    case "intersection":
      return isProvablyNonUniversalInputNode(node.left) ||
        isProvablyNonUniversalInputNode(node.right);
    case "string":
    case "number":
    case "boolean":
    case "literal":
    case "enum":
    case "never":
    case "array":
    case "tuple":
    case "object":
    case "record":
      return true;
    case "reference":
    case "opaque":
      return false;
  }
}

function isProvablyIdentityNode(node: ContractGraphNode): boolean {
  switch (node.kind) {
    case "string":
    case "number":
    case "boolean":
    case "literal":
    case "enum":
    case "unknown":
    case "never":
      return true;
    case "array":
      return isProvablyIdentityNode(node.item);
    case "tuple":
      return node.items.every(isProvablyIdentityNode);
    case "union":
    case "discriminatedUnion":
      return node.choices.every(isProvablyIdentityNode);
    case "intersection":
      return false;
    case "object":
      return node.unknownProperties !== "strip" &&
        Object.values(node.shape).every(isProvablyIdentityNode);
    case "record":
      return isProvablyIdentityNode(node.value);
    case "nullable":
    case "optional":
      return isProvablyIdentityNode(node.inner);
    case "transform":
    case "reference":
    case "opaque":
      return false;
  }
}

type RuntimeValueFamily =
  | "array"
  | "boolean"
  | "null"
  | "number"
  | "object"
  | "other"
  | "string"
  | "undefined";

const ALL_RUNTIME_VALUE_FAMILIES: readonly RuntimeValueFamily[] = Object.freeze([
  "array",
  "boolean",
  "null",
  "number",
  "object",
  "other",
  "string",
  "undefined",
]);

function areProvablyDisjoint(left: ContractGraphNode, right: ContractGraphNode): boolean {
  if (isProvablyEmptyNode(left) || isProvablyEmptyNode(right)) return true;
  if (left.kind === "literal" && isLiteralAcceptanceDecidable(right)) {
    return !nodeAcceptsLiteral(right, left.value);
  }
  if (right.kind === "literal" && isLiteralAcceptanceDecidable(left)) {
    return !nodeAcceptsLiteral(left, right.value);
  }

  const leftFamilies = runtimeValueFamilies(left);
  const rightFamilies = runtimeValueFamilies(right);
  return leftFamilies.every((family) => !rightFamilies.includes(family));
}

function runtimeValueFamilies(node: ContractGraphNode): readonly RuntimeValueFamily[] {
  switch (node.kind) {
    case "string":
      return ["string"];
    case "number":
      return ["number"];
    case "boolean":
      return ["boolean"];
    case "literal":
      return [literalRuntimeValueFamily(node.value)];
    case "enum":
      return [...new Set(node.values.map((value) => typeof value as "string" | "number"))];
    case "unknown":
      return ALL_RUNTIME_VALUE_FAMILIES;
    case "never":
      return [];
    case "array":
    case "tuple":
      return ["array"];
    case "union":
    case "discriminatedUnion":
      return [...new Set(node.choices.flatMap(runtimeValueFamilies))];
    case "intersection": {
      const rightFamilies = runtimeValueFamilies(node.right);
      return runtimeValueFamilies(node.left).filter((family) => rightFamilies.includes(family));
    }
    case "object":
    case "record":
      return ["object"];
    case "nullable":
      return [...new Set([...runtimeValueFamilies(node.inner), "null" as const])];
    case "optional":
      return [...new Set([...runtimeValueFamilies(node.inner), "undefined" as const])];
    case "transform":
      return runtimeValueFamilies(node.inner);
    case "reference":
    case "opaque":
      return ALL_RUNTIME_VALUE_FAMILIES;
  }
}

function literalRuntimeValueFamily(value: ContractLiteralValue): RuntimeValueFamily {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return typeof value as "string" | "number" | "boolean";
  }
  return value.$safeShape === "undefined" ? "undefined" : "number";
}

function isLiteralAcceptanceDecidable(target: ContractGraphNode): boolean {
  if ((target.refinements ?? []).length > 0) return false;

  switch (target.kind) {
    case "transform":
      return false;
    case "nullable":
    case "optional":
      return isLiteralAcceptanceDecidable(target.inner);
    case "union":
    case "discriminatedUnion":
      return target.choices.every(isLiteralAcceptanceDecidable);
    case "intersection":
      return isLiteralAcceptanceDecidable(target.left) &&
        isLiteralAcceptanceDecidable(target.right);
    case "string":
    case "number":
    case "boolean":
    case "literal":
    case "enum":
    case "unknown":
    case "never":
    case "array":
    case "tuple":
    case "object":
    case "record":
      return true;
    case "reference":
    case "opaque":
      return false;
  }
}

function nodeAcceptsLiteral(target: ContractGraphNode, value: ContractLiteralValue): boolean {
  if (target.kind === "unknown") return true;
  if (target.kind === "never") return false;
  if (target.kind === "literal") return contractLiteralEquals(target.value, value);
  if (target.kind === "enum") {
    return (typeof value === "string" || typeof value === "number") &&
      target.values.some((candidate) => Object.is(candidate, value));
  }
  if (target.kind === "nullable") {
    return value === null || nodeAcceptsLiteral(target.inner, value);
  }
  if (target.kind === "optional") {
    return isUndefinedLiteral(value) || nodeAcceptsLiteral(target.inner, value);
  }
  if (target.kind === "union" || target.kind === "discriminatedUnion") {
    return target.choices.some((choice) => nodeAcceptsLiteral(choice, value));
  }
  if (target.kind === "intersection") {
    return nodeAcceptsLiteral(target.left, value) && nodeAcceptsLiteral(target.right, value);
  }
  if (typeof value === "string") {
    if (target.kind !== "string") return false;
    const length = unicodeCodePointLength(value);
    return length >= (target.constraints?.minLength ?? 0) &&
      length <= (target.constraints?.maxLength ?? Number.POSITIVE_INFINITY) &&
      (target.constraints?.pattern === undefined || new RegExp(target.constraints.pattern, "u").test(value)) &&
      (target.constraints?.format === undefined || matchesContractStringFormat(
        value,
        target.constraints.format,
      ));
  }
  if (typeof value === "boolean") return target.kind === "boolean";
  const numericValue = typeof value === "number"
    ? value
    : isRecord(value) && value.$safeShape === "-0"
      ? -0
      : undefined;
  if (numericValue !== undefined) {
    if (target.kind !== "number") return false;
    return numericValue >= (target.constraints?.minimum ?? Number.NEGATIVE_INFINITY) &&
      numericValue <= (target.constraints?.maximum ?? Number.POSITIVE_INFINITY) &&
      (target.constraints?.integer !== true || Number.isInteger(numericValue)) &&
      (target.constraints?.multipleOf === undefined ||
        isExactDecimalMultiple(numericValue, target.constraints.multipleOf));
  }
  return false;
}

function contractLiteralEquals(left: ContractLiteralValue, right: ContractLiteralValue): boolean {
  if (!isRecord(left) || !isRecord(right)) return Object.is(left, right);
  return left.$safeShape === right.$safeShape;
}

const CONTRACT_EMAIL_PATTERN = /^(?=.{3,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/u;
const CONTRACT_UUID_PATTERN = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/u;
const CONTRACT_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const CONTRACT_DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/u;

function matchesContractStringFormat(value: string, format: StringFormat): boolean {
  switch (format) {
    case "email":
      return CONTRACT_EMAIL_PATTERN.test(value);
    case "uuid":
      return CONTRACT_UUID_PATTERN.test(value);
    case "date": {
      const match = CONTRACT_DATE_PATTERN.exec(value);
      return match !== null && isValidContractDate(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
      );
    }
    case "date-time": {
      const match = CONTRACT_DATE_TIME_PATTERN.exec(value);
      if (match === null || !isValidContractDate(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
      )) {
        return false;
      }

      const hour = Number(match[4]);
      const minute = Number(match[5]);
      const second = Number(match[6]);
      const offsetHour = match[8] === undefined ? 0 : Number(match[8]);
      const offsetMinute = match[9] === undefined ? 0 : Number(match[9]);
      return hour <= 23 && minute <= 59 && second <= 59 &&
        offsetHour <= 23 && offsetMinute <= 59;
    }
  }
}

function isValidContractDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = month === 2
    ? (isContractLeapYear(year) ? 29 : 28)
    : month === 4 || month === 6 || month === 9 || month === 11
      ? 30
      : 31;
  return day <= daysInMonth;
}

function isContractLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function unicodeCodePointLength(value: string): number {
  let length = 0;
  for (const _character of value) length += 1;
  return length;
}

function unwrapObjectProperty(node: ContractGraphNode): ContractGraphNode {
  return node.kind === "optional" ? node.inner : node;
}

function kindChange(
  previous: ContractGraphNode,
  next: ContractGraphNode,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  status: "breaking" | "unknown",
  message: string,
): Analysis {
  return analysisFromFindings([createFinding(
    "contract.kind.changed",
    status,
    path,
    direction,
    previous,
    next,
    message,
    "Keep both representations during migration or version the contract.",
  )]);
}

function incompatibleKind(
  previous: ContractGraphNode,
  next: ContractGraphNode,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  message: string,
): Analysis {
  return kindChange(previous, next, path, direction, "breaking", message);
}

function isProvablyBreakingKindChange(source: ContractGraphNode, target: ContractGraphNode): boolean {
  const primitiveKinds = new Set(["string", "number", "boolean"]);
  if (primitiveKinds.has(source.kind) && primitiveKinds.has(target.kind)) return true;
  if (source.kind === "literal" && primitiveKinds.has(target.kind)) return true;
  if (primitiveKinds.has(source.kind) && target.kind === "literal") return true;
  return false;
}

function isUndefinedLiteral(value: ContractLiteralValue): boolean {
  return isRecord(value) && value.$safeShape === "undefined";
}

function createFinding(
  code: string,
  status: CompatibilityStatus,
  path: readonly ContractPathSegment[],
  direction: CompatibilityDirection,
  previous: ContractGraphNode | null,
  next: ContractGraphNode | null,
  message: string,
  suggestion?: string,
): GraphCompatibilityFinding {
  return Object.freeze({
    code,
    status,
    path: Object.freeze([...path]),
    direction,
    previous,
    next,
    message,
    ...(suggestion === undefined ? {} : { suggestion }),
  });
}

function emptyAnalysis(status: CompatibilityStatus): Analysis {
  return Object.freeze({ status, findings: Object.freeze([]) });
}

function analysisFromFindings(findings: readonly GraphCompatibilityFinding[]): Analysis {
  return Object.freeze({
    status: aggregateStatus(findings.map((finding) => finding.status)),
    findings: Object.freeze([...findings]),
  });
}

function combineAnalyses(analyses: readonly Analysis[]): Analysis {
  return Object.freeze({
    status: aggregateStatus(analyses.map((analysis) => analysis.status)),
    findings: Object.freeze(analyses.flatMap((analysis) => analysis.findings)),
  });
}

function aggregateStatus(statuses: readonly CompatibilityStatus[]): CompatibilityStatus {
  if (statuses.includes("breaking")) return "breaking";
  if (statuses.includes("unknown")) return "unknown";
  if (statuses.includes("risky")) return "risky";
  if (statuses.includes("safe")) return "safe";
  if (statuses.includes("annotation-only")) return "annotation-only";
  return "safe";
}

function isCompatibleStatus(status: CompatibilityStatus): boolean {
  return status === "safe" || status === "annotation-only";
}

function freezeSnapshot(snapshot: ContractSnapshot): ContractSnapshot {
  return Object.freeze(snapshot);
}

function validateId(id: string): string {
  if (id.trim().length === 0) throw new TypeError("Contract and opaque behavior ids must not be empty.");
  return id;
}

function expectRecord(value: unknown, path: string): Readonly<Record<string, unknown>> {
  if (!isRecord(value)) throw new TypeError(`${path} must be an object.`);
  return value;
}

function expectString(value: unknown, path: string): string {
  if (typeof value !== "string") throw new TypeError(`${path} must be a string.`);
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defineRecordValue<TValue>(
  record: Record<string, TValue>,
  key: string,
  value: TValue,
): void {
  Object.defineProperty(record, key, {
    value,
    enumerable: true,
    configurable: true,
    writable: true,
  });
}

function isContractNode(value: unknown): value is ContractGraphNode {
  return isRecord(value) && typeof value.kind === "string";
}
