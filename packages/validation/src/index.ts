import type { Issue, Schema } from "@safe-shape/core";

export type ValidationReport<T> = ValidationSuccess<T> | ValidationFailure;

export interface ValidationSuccess<T> {
  readonly valid: true;
  readonly data: T;
}

export interface ValidationFailure {
  readonly valid: false;
  readonly issues: readonly Issue[];
}

export function validateSchema<TOutput, TInput>(
  schema: Schema<TOutput, TInput>,
  input: unknown,
): ValidationReport<TOutput> {
  const result = schema.safeParse(input);

  if (result.success) {
    return Object.freeze({
      valid: true,
      data: result.data,
    });
  }

  return Object.freeze({
    valid: false,
    issues: Object.freeze([...result.error.issues]),
  });
}
