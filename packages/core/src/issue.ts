export type IssuePathSegment = string | number;

export type IssueCode =
  | "invalid_type"
  | "invalid_literal"
  | "invalid_enum"
  | "invalid_string_pattern"
  | "invalid_string_format"
  | "forbidden_value"
  | "invalid_union"
  | "invalid_discriminator"
  | "intersection_conflict"
  | "invalid_tuple_length"
  | "too_small"
  | "too_large"
  | "not_integer"
  | "not_multiple_of"
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
  readonly branches?: readonly UnionIssueBranch[];
}

export interface UnionIssueBranch {
  readonly index: number;
  readonly issues: readonly Issue[];
}

export interface IssueInput {
  readonly code: IssueCode;
  readonly path: readonly IssuePathSegment[];
  readonly expected: string;
  readonly received: unknown;
  readonly message: string;
  readonly suggestion?: string | undefined;
  readonly receivedDescription?: string | undefined;
  readonly branches?: readonly UnionIssueBranch[] | undefined;
}

export function createIssue(input: IssueInput): Issue {
  const branches = freezeUnionIssueBranches(input.code, input.branches);
  const issue: Issue = {
    code: input.code,
    path: Object.freeze([...input.path]),
    expected: input.expected,
    received: input.receivedDescription ?? describeReceived(input.received),
    message: input.message,
    ...(input.suggestion === undefined ? {} : { suggestion: input.suggestion }),
    ...(branches === undefined ? {} : { branches }),
  };

  return Object.freeze(issue);
}

function freezeUnionIssueBranches(
  code: IssueCode,
  branches: readonly UnionIssueBranch[] | undefined,
): readonly UnionIssueBranch[] | undefined {
  if (branches === undefined) return undefined;
  if (code !== "invalid_union") {
    throw new TypeError("Issue branches are only valid for invalid_union issues.");
  }
  if (!Array.isArray(branches) || branches.length === 0) {
    throw new TypeError("Union issue branches must be a non-empty array.");
  }

  const seen = new Set<number>();
  return Object.freeze(branches.map((branch) => {
    if (!Number.isSafeInteger(branch.index) || branch.index < 0 || seen.has(branch.index)) {
      throw new TypeError("Union issue branch indexes must be unique non-negative safe integers.");
    }
    if (!Array.isArray(branch.issues) || branch.issues.length === 0) {
      throw new TypeError("Each union issue branch must contain at least one issue.");
    }
    seen.add(branch.index);
    return Object.freeze({
      index: branch.index,
      issues: Object.freeze([...branch.issues]),
    });
  }));
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
