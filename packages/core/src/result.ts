import type { Issue, Warning } from "./issue.js";

export interface ParseSuccess<T> {
  readonly success: true;
  readonly data: T;
  readonly warnings?: readonly Warning[];
}

export interface ParseFailure {
  readonly success: false;
  readonly error: ValidationError;
}

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export function success<T>(data: T, warnings: readonly Warning[] = []): ParseSuccess<T> {
  return Object.freeze({
    success: true,
    data,
    ...(warnings.length === 0 ? {} : { warnings: Object.freeze([...warnings]) }),
  });
}

export function failure(issues: readonly Issue[], warnings: readonly Warning[] = []): ParseFailure {
  return Object.freeze({ success: false, error: new ValidationError(issues, warnings) });
}

export class ValidationError extends Error {
  override readonly name = "ValidationError";
  readonly issues: readonly Issue[];
  readonly warnings: readonly Warning[];

  constructor(issues: readonly Issue[], warnings: readonly Warning[] = []) {
    super(formatValidationMessage(issues));
    this.issues = Object.freeze([...issues]);
    this.warnings = Object.freeze([...warnings]);
  }
}

function formatValidationMessage(issues: readonly Issue[]): string {
  if (issues.length === 0) {
    return "Validation failed.";
  }

  const firstIssue = issues[0]!;
  const location = firstIssue.path.length === 0 ? "input" : firstIssue.path.join(".");
  const suffix = issues.length === 1 ? "" : ` (${issues.length} issues total)`;

  return `${firstIssue.message} at ${location}${suffix}`;
}
