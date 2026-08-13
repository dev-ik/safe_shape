import {
  createIssue,
  type Issue,
  type IssueInput,
  type IssuePathSegment,
} from "./issue.js";

export type ContextIssueInput = Omit<IssueInput, "path"> & {
  readonly path?: readonly IssuePathSegment[];
};

export interface ParseContext {
  readonly path: readonly IssuePathSegment[];
  child(segment: IssuePathSegment): ParseContext;
  issue(input: ContextIssueInput): Issue;
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
}
