export type IssuePathSegment = string | number;
export type DiagnosticSeverity = "error" | "warning";
export type DiagnosticParameter =
  | null
  | boolean
  | number
  | string
  | readonly DiagnosticParameter[]
  | { readonly [key: string]: DiagnosticParameter };

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
  readonly severity: "error";
  readonly code: IssueCode;
  readonly path: readonly IssuePathSegment[];
  readonly expected: string;
  readonly received: string;
  readonly message: string;
  readonly suggestion?: string;
  readonly ruleId?: string;
  readonly params?: DiagnosticParameter;
  readonly branches?: readonly UnionIssueBranch[];
}

export interface Warning extends Omit<Issue, "severity" | "branches"> {
  readonly severity: "warning";
  readonly branches?: readonly UnionDiagnosticBranch[];
}

export type Diagnostic = Issue | Warning;

export interface UnionIssueBranch {
  readonly index: number;
  readonly issues: readonly Issue[];
  readonly warnings?: readonly Warning[];
}

export interface UnionDiagnosticBranch {
  readonly index: number;
  readonly diagnostics: readonly Diagnostic[];
}

export interface IssueInput {
  readonly code: IssueCode;
  readonly path: readonly IssuePathSegment[];
  readonly expected: string;
  readonly received: unknown;
  readonly message: string;
  readonly suggestion?: string | undefined;
  readonly ruleId?: string | undefined;
  readonly params?: DiagnosticParameter | undefined;
  readonly receivedDescription?: string | undefined;
  readonly branches?: readonly UnionIssueBranch[] | undefined;
}

export function createIssue(input: IssueInput): Issue {
  const branches = freezeUnionIssueBranches(input.code, input.branches);
  const issue: Issue = {
    severity: "error",
    code: input.code,
    path: Object.freeze([...input.path]),
    expected: input.expected,
    received: input.receivedDescription ?? describeReceived(input.received),
    message: input.message,
    ...(input.suggestion === undefined ? {} : { suggestion: input.suggestion }),
    ...(input.ruleId === undefined ? {} : { ruleId: validateRuleId(input.ruleId) }),
    ...(input.params === undefined ? {} : { params: freezeDiagnosticParameter(input.params) }),
    ...(branches === undefined ? {} : { branches }),
  };

  return Object.freeze(issue);
}

export interface WarningInput extends Omit<IssueInput, "branches"> {
  readonly branches?: readonly UnionDiagnosticBranch[] | undefined;
}

export function createWarning(input: WarningInput): Warning {
  const warning: Warning = {
    severity: "warning",
    code: input.code,
    path: Object.freeze([...input.path]),
    expected: input.expected,
    received: input.receivedDescription ?? describeReceived(input.received),
    message: input.message,
    ...(input.suggestion === undefined ? {} : { suggestion: input.suggestion }),
    ...(input.ruleId === undefined ? {} : { ruleId: validateRuleId(input.ruleId) }),
    ...(input.params === undefined ? {} : { params: freezeDiagnosticParameter(input.params) }),
    ...(input.branches === undefined ? {} : {
      branches: Object.freeze(input.branches.map((branch) => Object.freeze({
        index: branch.index,
        diagnostics: Object.freeze([...branch.diagnostics]),
      }))),
    }),
  };
  return Object.freeze(warning);
}

export function freezeDiagnosticParameter(value: DiagnosticParameter): DiagnosticParameter {
  const frozen = freezeDiagnosticParameterAt(value, 0, {
    entries: 0,
    ancestors: new Set<object>(),
  });
  const serialized = JSON.stringify(frozen);
  if (serialized === undefined || serialized.length > 16_384) {
    throw new TypeError("Diagnostic params must not exceed 16384 serialized characters.");
  }
  return frozen;
}

function validateRuleId(value: unknown): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new TypeError("Diagnostic ruleId must be a non-empty string.");
  }
  return value;
}

function freezeDiagnosticParameterAt(
  value: DiagnosticParameter,
  depth: number,
  state: { entries: number; ancestors: Set<object> },
): DiagnosticParameter {
  if (depth > 20) throw new TypeError("Diagnostic params must not exceed 20 levels.");
  state.entries += 1;
  if (state.entries > 1_000) throw new TypeError("Diagnostic params must not exceed 1000 entries.");
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError("Diagnostic params numbers must be finite.");
    return value;
  }
  if (Array.isArray(value)) {
    if (state.ancestors.has(value)) throw new TypeError("Diagnostic params must not contain cycles.");
    state.ancestors.add(value);
    try {
      return Object.freeze(value.map((item) => freezeDiagnosticParameterAt(item, depth + 1, state)));
    } finally {
      state.ancestors.delete(value);
    }
  }
  if (typeof value !== "object") throw new TypeError("Diagnostic params must be JSON-safe.");
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Diagnostic params objects must use a plain or null prototype.");
  }
  if (state.ancestors.has(value)) throw new TypeError("Diagnostic params must not contain cycles.");
  state.ancestors.add(value);
  const output: Record<string, DiagnosticParameter> = {};
  try {
    for (const key of Object.keys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (descriptor === undefined || !("value" in descriptor)) {
        throw new TypeError("Diagnostic params must not contain accessors.");
      }
      Object.defineProperty(output, key, {
        enumerable: true,
        value: freezeDiagnosticParameterAt(
          descriptor.value as DiagnosticParameter,
          depth + 1,
          state,
        ),
      });
    }
  } finally {
    state.ancestors.delete(value);
  }
  return Object.freeze(output);
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
      ...(branch.warnings === undefined
        ? {}
        : { warnings: Object.freeze([...branch.warnings]) }),
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
