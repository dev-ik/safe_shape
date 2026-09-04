import type {
  Diagnostic as NativeDiagnostic,
  DiagnosticParameter,
  DiagnosticSeverity,
  Issue,
  IssueCode,
  IssuePathSegment,
  Warning,
} from "./issue.js";
import type { ValidationError } from "./result.js";

export interface IssueGroup {
  readonly path: readonly IssuePathSegment[];
  readonly issues: readonly Issue[];
}

export type IssueMessageFormatter = (issue: Issue) => string;
export type DiagnosticMessageFormatter = (diagnostic: NativeDiagnostic) => string;

export interface FormatIssuesOptions {
  readonly formatMessage?: IssueMessageFormatter;
}

export interface FormatDiagnosticsOptions {
  readonly formatMessage?: DiagnosticMessageFormatter;
}

export interface FieldErrorOptions {
  readonly formatMessage?: IssueMessageFormatter;
  readonly formatPath?: (path: readonly IssuePathSegment[]) => string;
  readonly rootKey?: string;
}

export interface FormattedDiagnostic {
  readonly severity: DiagnosticSeverity;
  readonly code: IssueCode;
  readonly path: string;
  readonly message: string;
  readonly expected: string;
  readonly received: string;
  readonly suggestion?: string;
  readonly ruleId?: string;
  readonly params?: DiagnosticParameter;
  readonly branches?: readonly FormattedDiagnosticBranch[];
}

export interface FormattedDiagnosticBranch {
  readonly index: number;
  readonly issues: readonly FormattedDiagnostic[];
}

export function createDiagnostic(issue: Issue): FormattedDiagnostic {
  return createDiagnosticWithFormatter(issue, undefined);
}

export function createFormattedDiagnostic(diagnostic: NativeDiagnostic): FormattedDiagnostic {
  return createDiagnosticWithFormatter(diagnostic, undefined);
}

function createDiagnosticWithFormatter(
  issue: NativeDiagnostic,
  formatMessage: DiagnosticMessageFormatter | undefined,
): FormattedDiagnostic {
  const message = formatMessage === undefined ? issue.message : formatMessage(issue);
  assertFormatterResult(message, "Issue message formatter");
  const branches = issue.branches === undefined
    ? undefined
    : issue.severity === "error"
      ? issue.branches.map((branch) => ({ index: branch.index, diagnostics: branch.issues }))
      : issue.branches;
  const diagnostic: FormattedDiagnostic = {
    severity: issue.severity,
    code: issue.code,
    path: formatIssuePath(issue.path),
    message,
    expected: issue.expected,
    received: issue.received,
    ...(issue.suggestion === undefined ? {} : { suggestion: issue.suggestion }),
    ...(issue.ruleId === undefined ? {} : { ruleId: issue.ruleId }),
    ...(issue.params === undefined ? {} : { params: issue.params }),
    ...(branches === undefined
      ? {}
      : {
          branches: Object.freeze(branches.map((branch) => Object.freeze({
            index: branch.index,
            issues: Object.freeze(branch.diagnostics.map((branchIssue) =>
              createDiagnosticWithFormatter(branchIssue, formatMessage))),
          }))),
        }),
  };

  return Object.freeze(diagnostic);
}

export function createDiagnostics(issues: readonly Issue[]): readonly FormattedDiagnostic[] {
  return Object.freeze(issues.map(createDiagnostic));
}

export function formatDiagnostics(
  diagnostics: readonly NativeDiagnostic[],
  options?: FormatDiagnosticsOptions,
): readonly string[] {
  return Object.freeze(diagnostics.map((diagnostic) => formatDiagnostic(
    createDiagnosticWithFormatter(diagnostic, options?.formatMessage),
  )));
}

export function formatWarnings(
  warnings: readonly Warning[],
  options?: FormatDiagnosticsOptions,
): readonly string[] {
  return formatDiagnostics(warnings, options);
}

export function formatIssuePath(path: readonly IssuePathSegment[]): string {
  if (path.length === 0) {
    return "input";
  }

  return path.reduce<string>((formattedPath, segment) => {
    if (typeof segment === "number") {
      return `${formattedPath}[${segment}]`;
    }

    if (isIdentifier(segment)) {
      return `${formattedPath}.${segment}`;
    }

    return `${formattedPath}[${JSON.stringify(segment)}]`;
  }, "input");
}

export function formatDiagnostic(diagnostic: FormattedDiagnostic): string {
  return formatDiagnosticWithIndent(diagnostic, "");
}

function formatDiagnosticWithIndent(diagnostic: FormattedDiagnostic, indent: string): string {
  const suggestion =
    diagnostic.suggestion === undefined ? "" : ` Suggestion: ${diagnostic.suggestion}`;
  const summary = `${indent}${diagnostic.path}: ${diagnostic.message} Expected ${diagnostic.expected}; received ${diagnostic.received}.${suggestion} (${diagnostic.code})`;

  if (diagnostic.branches === undefined) {
    return summary;
  }

  const branchLines = diagnostic.branches.flatMap((branch) => [
    `${indent}  Union branch ${branch.index}:`,
    ...branch.issues.map((issue) => formatDiagnosticWithIndent(issue, `${indent}    `)),
  ]);

  return [summary, ...branchLines].join("\n");
}

export function formatIssues(
  issues: readonly Issue[],
  options?: FormatIssuesOptions,
): readonly string[] {
  const diagnostics = options?.formatMessage === undefined
    ? createDiagnostics(issues)
    : Object.freeze(issues.map((issue) =>
        createDiagnosticWithFormatter(issue, (diagnostic) =>
          options.formatMessage!(diagnostic as Issue))));
  return Object.freeze(diagnostics.map(formatDiagnostic));
}

export function formatValidationError(
  error: ValidationError,
  options?: FormatIssuesOptions,
): string {
  return formatIssues(error.issues, options).join("\n");
}

export function groupIssuesByPath(issues: readonly Issue[]): readonly IssueGroup[] {
  interface PathNode {
    readonly children: Map<IssuePathSegment, PathNode>;
    groupIndex?: number;
  }

  const root: PathNode = { children: new Map() };
  const groups: { readonly path: readonly IssuePathSegment[]; readonly issues: Issue[] }[] = [];

  for (const issue of issues) {
    let node = root;
    for (const segment of issue.path) {
      let child = node.children.get(segment);
      if (child === undefined) {
        child = { children: new Map() };
        node.children.set(segment, child);
      }
      node = child;
    }

    if (node.groupIndex === undefined) {
      node.groupIndex = groups.length;
      groups.push({ path: Object.freeze([...issue.path]), issues: [issue] });
    } else {
      groups[node.groupIndex]!.issues.push(issue);
    }
  }

  return Object.freeze(groups.map((group) => Object.freeze({
    path: group.path,
    issues: Object.freeze([...group.issues]),
  })));
}

export function toFieldErrors(
  issues: readonly Issue[],
  options?: FieldErrorOptions,
): Readonly<Record<string, readonly string[]>> {
  const rootKey = options?.rootKey ?? "_root";
  assertNonEmptyString(rootKey, "Field error root key");

  const fieldErrors: Record<string, readonly string[]> = {};
  const fieldPaths = new Map<string, readonly IssuePathSegment[]>();

  for (const group of groupIssuesByPath(issues)) {
    const key = group.path.length === 0
      ? rootKey
      : options?.formatPath === undefined
        ? formatFieldPath(group.path)
        : options.formatPath(group.path);
    assertNonEmptyString(key, "Field path formatter");

    const existingPath = fieldPaths.get(key);
    if (existingPath !== undefined) {
      throw new TypeError(
        `Distinct issue paths map to the same field error key ${JSON.stringify(key)}.`,
      );
    }

    const messages = Object.freeze(group.issues.map((issue) => {
      const message = options?.formatMessage === undefined
        ? issue.message
        : options.formatMessage(issue);
      assertFormatterResult(message, "Issue message formatter");
      return message;
    }));

    Object.defineProperty(fieldErrors, key, {
      configurable: false,
      enumerable: true,
      value: messages,
      writable: false,
    });
    fieldPaths.set(key, group.path);
  }

  return Object.freeze(fieldErrors);
}

function formatFieldPath(path: readonly IssuePathSegment[]): string {
  return path.reduce<string>((formattedPath, segment) => {
    if (typeof segment === "number") {
      return `${formattedPath}[${segment}]`;
    }

    if (isIdentifier(segment)) {
      return formattedPath.length === 0 ? segment : `${formattedPath}.${segment}`;
    }

    return `${formattedPath}[${JSON.stringify(segment)}]`;
  }, "");
}

function assertFormatterResult(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must return a string.`);
  }
}

function assertNonEmptyString(value: unknown, label: string): asserts value is string {
  if (typeof value !== "string") {
    throw new TypeError(`${label} must be a string.`);
  }
  if (value.length === 0) {
    throw new TypeError(`${label} must not be empty.`);
  }
}

function isIdentifier(value: string): boolean {
  return /^[$A-Z_a-z][$\w]*$/u.test(value);
}
