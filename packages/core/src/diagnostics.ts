import type { Issue, IssueCode, IssuePathSegment } from "./issue.js";
import type { ValidationError } from "./result.js";

export interface Diagnostic {
  readonly code: IssueCode;
  readonly path: string;
  readonly message: string;
  readonly expected: string;
  readonly received: string;
  readonly suggestion?: string;
}

export function createDiagnostic(issue: Issue): Diagnostic {
  const diagnostic: Diagnostic = {
    code: issue.code,
    path: formatIssuePath(issue.path),
    message: issue.message,
    expected: issue.expected,
    received: issue.received,
    ...(issue.suggestion === undefined ? {} : { suggestion: issue.suggestion }),
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
  const suggestion =
    diagnostic.suggestion === undefined ? "" : ` Suggestion: ${diagnostic.suggestion}`;

  return `${diagnostic.path}: ${diagnostic.message} Expected ${diagnostic.expected}; received ${diagnostic.received}.${suggestion} (${diagnostic.code})`;
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
