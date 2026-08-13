import type { Issue } from "./issue.js";

export interface ParseSuccess<T> {
  readonly success: true;
  readonly data: T;
}

export interface ParseFailure {
  readonly success: false;
  readonly error: ValidationError;
}

export type ParseResult<T> = ParseSuccess<T> | ParseFailure;

export function success<T>(data: T): ParseSuccess<T> {
  return Object.freeze({ success: true, data });
}

export function failure(issues: readonly Issue[]): ParseFailure {
  return Object.freeze({ success: false, error: new ValidationError(issues) });
}

export class ValidationError extends Error {
  override readonly name = "ValidationError";
  readonly issues: readonly Issue[];

  constructor(issues: readonly Issue[]) {
    super(formatValidationMessage(issues));
    this.issues = Object.freeze([...issues]);
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
