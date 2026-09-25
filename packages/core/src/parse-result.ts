import type { Issue, Warning } from "./issue.js";
import { failure, type ParseResult, type ParseSuccess } from "./result.js";

// Private traversal results never escape through Schema's public methods.
// Each failing layer carries diagnostics, not another native Error/stack.
export type InternalParseResult<T> = ParseSuccess<T> | {
  readonly success: false;
  readonly error: {
    readonly issues: readonly Issue[];
    readonly warnings: readonly Warning[];
  };
};

export function internalFailure(
  issues: readonly Issue[],
  warnings: readonly Warning[] = [],
): InternalParseResult<never> {
  return { success: false, error: { issues, warnings } };
}

export function toPublicResult<T>(result: InternalParseResult<T>): ParseResult<T> {
  return result.success ? result : failure(result.error.issues, result.error.warnings);
}
