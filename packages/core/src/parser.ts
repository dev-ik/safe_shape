import {
  createIssue,
  createWarning,
  type Issue,
  type IssueInput,
  type IssuePathSegment,
  type Warning,
  type WarningInput,
} from "./issue.js";

export type ContextIssueInput = Omit<IssueInput, "path"> & {
  readonly path?: readonly IssuePathSegment[];
};
export type ContextWarningInput = Omit<WarningInput, "path"> & {
  readonly path?: readonly IssuePathSegment[];
};

export interface ParseContext {
  readonly path: readonly IssuePathSegment[];
  child(segment: IssuePathSegment): ParseContext;
  issue(input: ContextIssueInput): Issue;
  warning(input: ContextWarningInput): Warning;
}

export function createParseContext(path: readonly IssuePathSegment[] = []): ParseContext {
  return new DefaultParseContext(path);
}

class DefaultParseContext implements ParseContext {
  readonly path: readonly IssuePathSegment[];

  constructor(path: readonly IssuePathSegment[]) {
    this.path = Object.freeze([...path]);
    Object.freeze(this);
  }

  child(segment: IssuePathSegment): ParseContext {
    return new DefaultParseContext([...this.path, segment]);
  }

  issue(input: ContextIssueInput): Issue {
    return createIssue({
      ...input,
      path: input.path ?? this.path,
    });
  }

  warning(input: ContextWarningInput): Warning {
    return createWarning({
      ...input,
      path: input.path ?? this.path,
    });
  }
}
