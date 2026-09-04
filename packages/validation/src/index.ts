import type { Issue, Schema, Warning } from "@safe-shape/core";

export type ValidationReport<T> = ValidationSuccess<T> | ValidationFailure;

export interface ValidationSuccess<T> {
  readonly valid: true;
  readonly data: T;
  readonly warnings?: readonly Warning[];
}

export interface ValidationFailure {
  readonly valid: false;
  readonly issues: readonly Issue[];
  readonly warnings?: readonly Warning[];
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
      ...(result.warnings === undefined ? {} : { warnings: result.warnings }),
    });
  }

  return Object.freeze({
    valid: false,
    issues: Object.freeze([...result.error.issues]),
    ...(result.error.warnings.length === 0
      ? {}
      : { warnings: result.error.warnings }),
  });
}

export async function validateSchemaAsync<TOutput, TInput>(
  schema: Schema<TOutput, TInput>,
  input: unknown,
): Promise<ValidationReport<TOutput>> {
  const result = await schema.safeParseAsync(input);
  if (result.success) {
    return Object.freeze({
      valid: true,
      data: result.data,
      ...(result.warnings === undefined ? {} : { warnings: result.warnings }),
    });
  }
  return Object.freeze({
    valid: false,
    issues: result.error.issues,
    ...(result.error.warnings.length === 0
      ? {}
      : { warnings: result.error.warnings }),
  });
}
