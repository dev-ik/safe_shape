import type { Issue, IssueCode, IssuePathSegment } from "./issue.js";
import type { ValidationError } from "./result.js";

export interface Diagnostic {
  readonly code: IssueCode;
  readonly path: string;
  readonly message: string;
  readonly expected: string;
  readonly received: string;
  readonly suggestion?: string;
  readonly branches?: readonly DiagnosticBranch[];
}

export interface DiagnosticBranch {
  readonly index: number;
  readonly issues: readonly Diagnostic[];
}

export function createDiagnostic(issue: Issue): Diagnostic {
  const diagnostic: Diagnostic = {
    code: issue.code,
    path: formatIssuePath(issue.path),
    message: issue.message,
    expected: issue.expected,
    received: issue.received,
    ...(issue.suggestion === undefined ? {} : { suggestion: issue.suggestion }),
    ...(issue.branches === undefined
      ? {}
      : {
          branches: Object.freeze(issue.branches.map((branch) => Object.freeze({
            index: branch.index,
            issues: createDiagnostics(branch.issues),
          }))),
        }),
  };

  return Object.freeze(diagnostic);
}

export function createDiagnostics(issues: readonly Issue[]): readonly Diagnostic[] {
  return Object.freeze(issues.map(createDiagnostic));
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

export function formatDiagnostic(diagnostic: Diagnostic): string {
  return formatDiagnosticWithIndent(diagnostic, "");
}

function formatDiagnosticWithIndent(diagnostic: Diagnostic, indent: string): string {
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

export function formatIssues(issues: readonly Issue[]): readonly string[] {
  return Object.freeze(createDiagnostics(issues).map(formatDiagnostic));
}

export function formatValidationError(error: ValidationError): string {
  return formatIssues(error.issues).join("\n");
}

function isIdentifier(value: string): boolean {
  return /^[$A-Z_a-z][$\w]*$/u.test(value);
}
