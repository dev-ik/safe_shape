export type IssuePathSegment = string | number;

export type IssueCode =
  | "invalid_type"
  | "invalid_literal"
  | "invalid_union"
  | "invalid_tuple_length"
  | "transform_failed"
  | "missing_property"
  | "unexpected_property"
  | "custom";

export interface Issue {
  readonly code: IssueCode;
  readonly path: readonly IssuePathSegment[];
  readonly expected: string;
  readonly received: string;
  readonly message: string;
  readonly suggestion?: string;
}

export interface IssueInput {
  readonly code: IssueCode;
  readonly path: readonly IssuePathSegment[];
  readonly expected: string;
  readonly received: unknown;
  readonly message: string;
  readonly suggestion?: string | undefined;
  readonly receivedDescription?: string | undefined;
}

export function createIssue(input: IssueInput): Issue {
  const issue: Issue = {
    code: input.code,
    path: Object.freeze([...input.path]),
    expected: input.expected,
    received: input.receivedDescription ?? describeReceived(input.received),
    message: input.message,
    ...(input.suggestion === undefined ? {} : { suggestion: input.suggestion }),
  };

  return Object.freeze(issue);
}

export function describeReceived(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (Array.isArray(value)) {
    return "array";
  }

  if (Number.isNaN(value)) {
    return "NaN";
  }

  if (value === Number.POSITIVE_INFINITY) {
    return "Infinity";
  }

  if (value === Number.NEGATIVE_INFINITY) {
    return "-Infinity";
  }

  return typeof value;
}

export function describeLiteral(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  if (typeof value === "number" || typeof value === "boolean" || value === null) {
    return String(value);
  }

  if (value === undefined) {
    return "undefined";
  }

  if (typeof value === "bigint") {
    return `${value}n`;
  }

  if (typeof value === "symbol") {
    return value.description === undefined ? "symbol" : `symbol(${value.description})`;
  }

  return Object.prototype.toString.call(value);
}
