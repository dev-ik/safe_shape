import {
  describeLiteral,
  type Issue,
  type IssuePathSegment,
  type UnionIssueBranch,
} from "./issue.js";
import { createParseContext, type ParseContext } from "./parser.js";
import { failure, success, type ParseResult } from "./result.js";
import type { StandardSchemaV1 } from "./standard-schema.js";

const parseSymbol: unique symbol = Symbol("safeShape.parse");
const optionalSymbol: unique symbol = Symbol("safeShape.optional");
const describeSymbol: unique symbol = Symbol("safeShape.describe");

export const SCHEMA_CONTRACT_FORMAT = "safe-shape.contract-ir/v2" as const;

export interface Schema<TOutput, TInput = TOutput>
  extends StandardSchemaV1<TInput, TOutput>
{
  readonly kind: string;
  parse(input: unknown): TOutput;
  safeParse(input: unknown): ParseResult<TOutput>;
  annotate(metadata: SchemaMetadata): Schema<TOutput, TInput>;
  refine(
    predicate: Refinement<TOutput>,
    options?: RefinementOptions,
  ): Schema<TOutput, TInput>;
  refineWithIssues(
    collector: CustomRefinement<TOutput>,
    options: CustomRefinementOptions,
  ): Schema<TOutput, TInput>;
  transform<TNextOutput>(
    mapper: Transform<TOutput, TNextOutput>,
    options?: TransformOptions,
  ): Schema<TNextOutput, TInput>;
  nullable(): Schema<TOutput | null, TInput | null>;
  optional(): OptionalSchemaType<TOutput | undefined, TInput | undefined>;
}

interface OptionalSchemaType<TOutput, TInput> extends Schema<TOutput, TInput> {
  readonly [optionalSymbol]: true;
  annotate(metadata: SchemaMetadata): OptionalSchemaType<TOutput, TInput>;
  refine(
    predicate: Refinement<TOutput>,
    options?: RefinementOptions,
  ): OptionalSchemaType<TOutput, TInput>;
  refineWithIssues(
    collector: CustomRefinement<TOutput>,
    options: CustomRefinementOptions,
  ): OptionalSchemaType<TOutput, TInput>;
}

export type InferOutput<TSchema extends Schema<any, any>> =
  TSchema extends Schema<infer Output, any> ? Output : never;

export type InferInput<TSchema extends Schema<any, any>> =
  TSchema extends Schema<any, infer Input> ? Input : never;

export type Infer<TSchema extends Schema<any, any>> = InferOutput<TSchema>;

export interface RefinementOptions {
  readonly id?: string;
  readonly path?: readonly IssuePathSegment[];
  readonly message?: string;
  readonly expected?: string;
  readonly suggestion?: string;
}

export type Refinement<T> = (value: T) => boolean;

export interface CustomIssueInput {
  readonly path?: readonly IssuePathSegment[];
  readonly message: string;
  readonly expected?: string;
  readonly suggestion?: string;
}

export interface CustomRefinementContext {
  addIssue(input: CustomIssueInput): void;
}

export interface CustomRefinementOptions {
  readonly id: string;
}

export type CustomRefinement<T> = (
  value: T,
  context: CustomRefinementContext,
) => void;

export interface TransformOptions {
  readonly id?: string;
  readonly message?: string;
  readonly expected?: string;
  readonly suggestion?: string;
}

export interface LazyOptions {
  readonly id: string;
}

export type Transform<TInput, TOutput> = (value: TInput) => TOutput;

export type Shape = Record<string, Schema<any, any>>;

type OptionalKeys<TShape extends Shape> = {
  [Key in keyof TShape]: TShape[Key] extends OptionalSchemaType<any, any> ? Key : never;
}[keyof TShape];

type RequiredKeys<TShape extends Shape> = Exclude<keyof TShape, OptionalKeys<TShape>>;

type Expand<T> = {
  [Key in keyof T]: T[Key];
} & {};

export type ObjectOutput<TShape extends Shape> = Expand<{
  [Key in RequiredKeys<TShape>]: InferOutput<TShape[Key]>;
} & {
  [Key in OptionalKeys<TShape>]?: Exclude<InferOutput<TShape[Key]>, undefined>;
}>;

export type ObjectInput<TShape extends Shape> = Expand<{
  [Key in RequiredKeys<TShape>]: InferInput<TShape[Key]>;
} & {
  [Key in OptionalKeys<TShape>]?: Exclude<InferInput<TShape[Key]>, undefined>;
}>;

export type UnknownPropertyPolicy = "reject" | "strip" | "passthrough";

export interface ObjectOptions<
  TPolicy extends UnknownPropertyPolicy = UnknownPropertyPolicy,
> {
  readonly unknownProperties?: TPolicy;
}

export type ObjectOutputWithPolicy<
  TShape extends Shape,
  TPolicy extends UnknownPropertyPolicy,
> = TPolicy extends "passthrough"
  ? ObjectOutput<TShape> & Readonly<Record<string, unknown>>
  : ObjectOutput<TShape>;

export type ObjectInputWithPolicy<
  TShape extends Shape,
  TPolicy extends UnknownPropertyPolicy,
> = TPolicy extends "reject"
  ? ObjectInput<TShape>
  : ObjectInput<TShape> & Readonly<Record<string, unknown>>;

export type RecordOutput<TValueSchema extends Schema<any, any>> = Readonly<
  Record<string, InferOutput<TValueSchema>>
>;

export type RecordInput<TValueSchema extends Schema<any, any>> = Readonly<
  Record<string, InferInput<TValueSchema>>
>;

export type TupleOutput<TItems extends readonly Schema<any, any>[]> = Readonly<{
  [Index in keyof TItems]: TItems[Index] extends Schema<any, any>
    ? InferOutput<TItems[Index]>
    : never;
}>;

export type TupleInput<TItems extends readonly Schema<any, any>[]> = Readonly<{
  [Index in keyof TItems]: TItems[Index] extends Schema<any, any>
    ? InferInput<TItems[Index]>
    : never;
}>;

export type LiteralValue = string | number | boolean | null | undefined;
export type EnumValue = string | number;
export type EnumValues = readonly [EnumValue, ...EnumValue[]];
export type DiscriminatedUnionChoices = readonly [
  Schema<any, any>,
  ...Schema<any, any>[],
];

export interface StringConstraints {
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly pattern?: string;
  readonly format?: StringFormat;
}

export type StringFormat = "email" | "uuid" | "date" | "date-time";

export interface NumberConstraints {
  readonly minimum?: number;
  readonly maximum?: number;
  readonly integer?: boolean;
  readonly multipleOf?: number;
}

export type IntegerConstraints = Omit<NumberConstraints, "integer">;

export interface ArrayConstraints {
  readonly minLength?: number;
  readonly maxLength?: number;
}

export interface RecordConstraints {
  readonly key?: StringConstraints;
}

export interface SchemaMetadata {
  readonly title?: string;
  readonly description?: string;
  readonly examples?: readonly unknown[];
}

type SchemaDefinitionBase = {
  readonly metadata?: SchemaMetadata;
  readonly refinements?: readonly (string | null)[];
};

export type SchemaDefinition =
  | (SchemaDefinitionBase & { readonly kind: "string"; readonly constraints?: StringConstraints })
  | (SchemaDefinitionBase & { readonly kind: "number"; readonly constraints?: NumberConstraints })
  | (SchemaDefinitionBase & { readonly kind: "boolean" })
  | (SchemaDefinitionBase & { readonly kind: "literal"; readonly value: LiteralValue })
  | (SchemaDefinitionBase & { readonly kind: "enum"; readonly values: readonly EnumValue[] })
  | (SchemaDefinitionBase & { readonly kind: "unknown" })
  | (SchemaDefinitionBase & { readonly kind: "never" })
  | (SchemaDefinitionBase & {
      readonly kind: "array";
      readonly item: SchemaDefinition;
      readonly constraints?: ArrayConstraints;
    })
  | (SchemaDefinitionBase & { readonly kind: "tuple"; readonly items: readonly SchemaDefinition[] })
  | (SchemaDefinitionBase & { readonly kind: "union"; readonly choices: readonly SchemaDefinition[] })
  | (SchemaDefinitionBase & {
      readonly kind: "discriminatedUnion";
      readonly discriminator: string;
      readonly choices: readonly SchemaDefinition[];
    })
  | (SchemaDefinitionBase & {
      readonly kind: "intersection";
      readonly left: SchemaDefinition;
      readonly right: SchemaDefinition;
    })
  | {
      readonly kind: "object";
      readonly shape: Readonly<Record<string, SchemaDefinition>>;
      readonly required: readonly string[];
      readonly unknownProperties: UnknownPropertyPolicy;
      readonly metadata?: SchemaMetadata;
      readonly refinements?: readonly (string | null)[];
    }
  | (SchemaDefinitionBase & {
      readonly kind: "record";
      readonly key?: StringConstraints;
      readonly value: SchemaDefinition;
    })
  | (SchemaDefinitionBase & { readonly kind: "nullable"; readonly inner: SchemaDefinition })
  | (SchemaDefinitionBase & { readonly kind: "optional"; readonly inner: SchemaDefinition })
  | (SchemaDefinitionBase & {
      readonly kind: "transform";
      readonly inner: SchemaDefinition;
      readonly id?: string;
    })
  | (SchemaDefinitionBase & {
      readonly kind: "reference";
      readonly id: string;
    })
  | (SchemaDefinitionBase & {
      readonly kind: "opaque";
      readonly behavior: "transform";
      readonly id?: string;
    });

export interface SchemaContractGraph {
  readonly root: SchemaDefinition;
  readonly definitions: Readonly<Record<string, SchemaDefinition>>;
}

export interface SchemaContractDescription {
  readonly format: typeof SCHEMA_CONTRACT_FORMAT;
  readonly input: SchemaContractGraph;
  readonly output: SchemaContractGraph;
}

type ContractSide = "input" | "output";

interface DescribeContext {
  readonly side: ContractSide;
  readonly definitions: Map<string, SchemaDefinition>;
  readonly owners: Map<string, InternalSchema<any, any>>;
  readonly resolving: Set<string>;
}

interface InternalSchema<TOutput, TInput = TOutput> extends Schema<TOutput, TInput> {
  readonly [optionalSymbol]?: true;
  [parseSymbol](input: unknown, context: ParseContext): ParseResult<TOutput>;
  [describeSymbol](context?: DescribeContext): SchemaDefinition;
}

interface PredicateCheck<T> {
  readonly kind: "predicate";
  readonly predicate: Refinement<T>;
  readonly options: RefinementOptions;
}

interface CollectorCheck<T> {
  readonly kind: "collector";
  readonly collector: CustomRefinement<T>;
  readonly options: CustomRefinementOptions;
}

type Check<T> = PredicateCheck<T> | CollectorCheck<T>;

abstract class BaseSchema<TOutput, TInput = TOutput>
  implements InternalSchema<TOutput, TInput>
{
  abstract readonly kind: string;
  readonly "~standard": StandardSchemaV1.Props<TInput, TOutput>;
  protected readonly checks: readonly Check<TOutput>[];

  protected constructor(checks: readonly Check<TOutput>[] = []) {
    this.checks = Object.freeze(checks.map(cloneCheck));
    this["~standard"] = Object.freeze({
      version: 1,
      vendor: "safe-shape",
      validate: (
        value: unknown,
        _options?: StandardSchemaV1.Options,
      ) => {
        const result = this.safeParse(value);
        return result.success
          ? Object.freeze({ value: result.data })
          : Object.freeze({ issues: result.error.issues });
      },
    });
  }

  parse(input: unknown): TOutput {
    const result = this.safeParse(input);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }

  safeParse(input: unknown): ParseResult<TOutput> {
    return this[parseSymbol](input, createParseContext());
  }

  annotate(metadata: SchemaMetadata): Schema<TOutput, TInput> {
    return new AnnotatedSchema(this, metadata);
  }

  refine(
    predicate: Refinement<TOutput>,
    options: RefinementOptions = {},
  ): Schema<TOutput, TInput> {
    return this.cloneWithChecks([
      ...this.checks,
      createCheck(predicate, options),
    ]);
  }

  refineWithIssues(
    collector: CustomRefinement<TOutput>,
    options: CustomRefinementOptions,
  ): Schema<TOutput, TInput> {
    return this.cloneWithChecks([
      ...this.checks,
      createCollectorCheck(collector, options),
    ]);
  }

  transform<TNextOutput>(
    mapper: Transform<TOutput, TNextOutput>,
    options: TransformOptions = {},
  ): Schema<TNextOutput, TInput> {
    return new TransformSchema(this, mapper, options);
  }

  nullable(): Schema<TOutput | null, TInput | null> {
    return new NullableSchema(this);
  }

  optional(): OptionalSchemaType<TOutput | undefined, TInput | undefined> {
    return new OptionalSchema(this);
  }

  [parseSymbol](input: unknown, context: ParseContext): ParseResult<TOutput> {
    const parsed = this.parseBase(input, context);

    if (!parsed.success) {
      return parsed;
    }

    return this.applyChecks(parsed.data, input, context);
  }

  protected abstract parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<TOutput>;

  protected abstract cloneWithChecks(
    checks: readonly Check<TOutput>[],
  ): BaseSchema<TOutput, TInput>;

  abstract [describeSymbol](context?: DescribeContext): SchemaDefinition;

  protected describeWithRefinements(definition: SchemaDefinition): SchemaDefinition {
    if (this.checks.length === 0) {
      return definition;
    }

    return Object.freeze({
      ...definition,
      refinements: Object.freeze([
        ...(definition.refinements ?? []),
        ...this.checks.map((check) => check.options.id ?? null),
      ]),
    }) as SchemaDefinition;
  }

  private applyChecks(
    data: TOutput,
    originalInput: unknown,
    context: ParseContext,
  ): ParseResult<TOutput> {
    const issues: Issue[] = [];

    for (const check of this.checks) {
      if (check.kind === "collector") {
        const collectorIssues: Issue[] = [];
        const collectorContext: CustomRefinementContext = Object.freeze({
          addIssue: (input: CustomIssueInput): void => {
            const relativePath = validateRelativeIssuePath(input.path);
            collectorIssues.push(context.issue({
              code: "custom",
              path: [...context.path, ...relativePath],
              expected: validateOptionalIssueText(input.expected, "Custom issue expected") ??
                `value satisfying custom rule ${JSON.stringify(check.options.id)}`,
              received: valueAtRelativePath(data, relativePath),
              message: validateIssueMessage(input.message),
              suggestion: validateOptionalIssueText(input.suggestion, "Custom issue suggestion"),
            }));
          },
        });
        let returned: unknown;

        try {
          returned = check.collector(data, collectorContext);
          if (isPromiseLike(returned)) {
            void Promise.resolve(returned).catch(() => undefined);
            collectorIssues.push(createCollectorExecutionIssue(
              check.options.id,
              originalInput,
              context,
              "Async custom diagnostic refinements are not supported.",
            ));
          }
        } catch {
          collectorIssues.push(createCollectorExecutionIssue(
            check.options.id,
            originalInput,
            context,
            "Custom diagnostic refinement failed to execute.",
          ));
        }

        issues.push(...collectorIssues);
        continue;
      }

      let passed = false;

      try {
        passed = check.predicate(data);
      } catch {
        passed = false;
      }

      if (!passed) {
        issues.push(
          context.issue({
            code: "custom",
            path: [...context.path, ...(check.options.path ?? [])],
            expected: check.options.expected ?? "value satisfying refinement",
            received: check.options.path === undefined
              ? originalInput
              : valueAtRelativePath(data, check.options.path),
            message: check.options.message ?? "Value did not satisfy refinement.",
            suggestion: check.options.suggestion,
          }),
        );
      }
    }

    return issues.length === 0 ? success(data) : failure(issues);
  }
}

class StringSchema extends BaseSchema<string> {
  readonly kind = "string";
  private readonly constraints: StringConstraints;
  private readonly patternMatcher: RegExp | undefined;

  constructor(
    constraints: StringConstraints = {},
    checks: readonly Check<string>[] = [],
  ) {
    super(checks);
    this.constraints = freezeStringConstraints(constraints);
    this.patternMatcher = this.constraints.pattern === undefined
      ? undefined
      : new RegExp(this.constraints.pattern, "u");
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<string> {
    if (typeof input !== "string") {
      return failure([context.issue({
        code: "invalid_type",
        expected: "string",
        received: input,
        message: "Expected a string.",
        suggestion: "Pass a string value.",
      })]);
    }

    if (this.constraints.minLength === undefined &&
        this.constraints.maxLength === undefined &&
        this.patternMatcher === undefined &&
        this.constraints.format === undefined) {
      return success(input);
    }

    const issues: Issue[] = [];
    const length = this.constraints.minLength === undefined &&
        this.constraints.maxLength === undefined
      ? undefined
      : unicodeCodePointLength(input);

    if (this.constraints.minLength !== undefined && length! < this.constraints.minLength) {
      issues.push(context.issue({
        code: "too_small",
        expected: `string length >= ${this.constraints.minLength}`,
        received: input,
        receivedDescription: `${length} code points`,
        message: `Expected a string with at least ${this.constraints.minLength} code points.`,
        suggestion: "Pass a longer string.",
      }));
    }

    if (this.constraints.maxLength !== undefined && length! > this.constraints.maxLength) {
      issues.push(context.issue({
        code: "too_large",
        expected: `string length <= ${this.constraints.maxLength}`,
        received: input,
        receivedDescription: `${length} code points`,
        message: `Expected a string with at most ${this.constraints.maxLength} code points.`,
        suggestion: "Pass a shorter string.",
      }));
    }

    if (this.patternMatcher !== undefined && !this.patternMatcher.test(input)) {
      const expected = `string matching /${this.constraints.pattern}/u`;
      issues.push(context.issue({
        code: "invalid_string_pattern",
        expected,
        received: input,
        receivedDescription: "string not matching pattern",
        message: `Expected a ${expected}.`,
        suggestion: "Pass a string that matches the declared pattern.",
      }));
    }

    if (this.constraints.format !== undefined &&
        !matchesStringFormat(input, this.constraints.format)) {
      issues.push(context.issue({
        code: "invalid_string_format",
        expected: `string format ${this.constraints.format}`,
        received: input,
        receivedDescription: `string with invalid ${this.constraints.format} format`,
        message: `Expected a valid ${this.constraints.format} string.`,
        suggestion: `Pass a string in SafeShape ${this.constraints.format} format.`,
      }));
    }

    return issues.length === 0 ? success(input) : failure(issues);
  }

  protected cloneWithChecks(checks: readonly Check<string>[]): BaseSchema<string> {
    return new StringSchema(this.constraints, checks);
  }

  [describeSymbol](): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({
      kind: "string",
      ...describeConstraints(this.constraints),
    }));
  }
}

class NumberSchema extends BaseSchema<number> {
  readonly kind = "number";
  private readonly constraints: NumberConstraints;
  private readonly multipleOfParts: DecimalNumber | undefined;

  constructor(
    constraints: NumberConstraints = {},
    checks: readonly Check<number>[] = [],
  ) {
    super(checks);
    this.constraints = freezeNumberConstraints(constraints);
    this.multipleOfParts = this.constraints.multipleOf === undefined
      ? undefined
      : decimalNumber(this.constraints.multipleOf);
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<number> {
    if (typeof input !== "number" || !Number.isFinite(input)) {
      return failure([context.issue({
        code: "invalid_type",
        expected: "finite number",
        received: input,
        message: "Expected a finite number.",
        suggestion: "Pass a number value without coercion.",
      })]);
    }

    if (this.constraints.integer !== true &&
        this.constraints.minimum === undefined &&
        this.constraints.maximum === undefined &&
        this.multipleOfParts === undefined) {
      return success(input);
    }

    const issues: Issue[] = [];

    if (this.constraints.integer === true && !Number.isInteger(input)) {
      issues.push(context.issue({
        code: "not_integer",
        expected: "integer",
        received: input,
        receivedDescription: "non-integer number",
        message: "Expected an integer.",
        suggestion: "Pass a whole number without a fractional part.",
      }));
    }

    if (this.constraints.minimum !== undefined && input < this.constraints.minimum) {
      issues.push(context.issue({
        code: "too_small",
        expected: `number >= ${this.constraints.minimum}`,
        received: input,
        receivedDescription: "number below minimum",
        message: `Expected a number greater than or equal to ${this.constraints.minimum}.`,
        suggestion: `Pass a number greater than or equal to ${this.constraints.minimum}.`,
      }));
    }

    if (this.constraints.maximum !== undefined && input > this.constraints.maximum) {
      issues.push(context.issue({
        code: "too_large",
        expected: `number <= ${this.constraints.maximum}`,
        received: input,
        receivedDescription: "number above maximum",
        message: `Expected a number less than or equal to ${this.constraints.maximum}.`,
        suggestion: `Pass a number less than or equal to ${this.constraints.maximum}.`,
      }));
    }

    if (this.multipleOfParts !== undefined && !isMultipleOf(input, this.multipleOfParts)) {
      issues.push(context.issue({
        code: "not_multiple_of",
        expected: `number multiple of ${this.constraints.multipleOf}`,
        received: input,
        receivedDescription: "number not matching multiple",
        message: `Expected a number divisible by ${this.constraints.multipleOf}.`,
        suggestion: `Pass an exact decimal multiple of ${this.constraints.multipleOf}.`,
      }));
    }

    return issues.length === 0 ? success(input) : failure(issues);
  }

  protected cloneWithChecks(checks: readonly Check<number>[]): BaseSchema<number> {
    return new NumberSchema(this.constraints, checks);
  }

  [describeSymbol](): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({
      kind: "number",
      ...describeConstraints(this.constraints),
    }));
  }
}

class BooleanSchema extends BaseSchema<boolean> {
  readonly kind = "boolean";

  constructor(checks: readonly Check<boolean>[] = []) {
    super(checks);
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<boolean> {
    if (typeof input === "boolean") {
      return success(input);
    }

    return failure([
      context.issue({
        code: "invalid_type",
        expected: "boolean",
        received: input,
        message: "Expected a boolean.",
        suggestion: "Pass true or false.",
      }),
    ]);
  }

  protected cloneWithChecks(checks: readonly Check<boolean>[]): BaseSchema<boolean> {
    return new BooleanSchema(checks);
  }

  [describeSymbol](): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({ kind: "boolean" }));
  }
}

class LiteralSchema<T extends LiteralValue> extends BaseSchema<T> {
  readonly kind = "literal";

  constructor(
    private readonly value: T,
    checks: readonly Check<T>[] = [],
  ) {
    super(checks);
    Object.freeze(this);
  }

  protected parseBase(input: unknown, context: ParseContext): ParseResult<T> {
    if (Object.is(input, this.value)) {
      return success(this.value);
    }

    return failure([
      context.issue({
        code: "invalid_literal",
        expected: describeLiteral(this.value),
        received: input,
        message: `Expected literal ${describeLiteral(this.value)}.`,
        suggestion: "Pass the exact literal value.",
      }),
    ]);
  }

  protected cloneWithChecks(checks: readonly Check<T>[]): BaseSchema<T> {
    return new LiteralSchema(this.value, checks);
  }

  [describeSymbol](): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({ kind: "literal", value: this.value }));
  }
}

class EnumSchema<const TValues extends EnumValues>
  extends BaseSchema<TValues[number]>
{
  readonly kind = "enum";
  private readonly values: TValues;

  constructor(
    values: TValues,
    checks: readonly Check<TValues[number]>[] = [],
  ) {
    super(checks);
    this.values = freezeEnumValues(values) as TValues;
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<TValues[number]> {
    if (this.values.some((value) => Object.is(value, input))) {
      return success(input as TValues[number]);
    }

    const expected = this.values.map(describeLiteral).join(" | ");
    return failure([
      context.issue({
        code: "invalid_enum",
        expected,
        received: input,
        message: `Expected one of ${expected}.`,
        suggestion: "Pass one of the declared enum values.",
      }),
    ]);
  }

  protected cloneWithChecks(
    checks: readonly Check<TValues[number]>[],
  ): BaseSchema<TValues[number]> {
    return new EnumSchema(this.values, checks);
  }

  [describeSymbol](): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({
      kind: "enum",
      values: this.values,
    }));
  }
}

class UnknownSchema extends BaseSchema<unknown> {
  readonly kind = "unknown";

  constructor(checks: readonly Check<unknown>[] = []) {
    super(checks);
    Object.freeze(this);
  }

  protected parseBase(input: unknown): ParseResult<unknown> {
    return success(input);
  }

  protected cloneWithChecks(checks: readonly Check<unknown>[]): BaseSchema<unknown> {
    return new UnknownSchema(checks);
  }

  [describeSymbol](): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({ kind: "unknown" }));
  }
}

class NeverSchema extends BaseSchema<never> {
  readonly kind = "never";

  constructor(checks: readonly Check<never>[] = []) {
    super(checks);
    Object.freeze(this);
  }

  protected parseBase(input: unknown, context: ParseContext): ParseResult<never> {
    return failure([
      context.issue({
        code: "forbidden_value",
        expected: "never",
        received: input,
        message: "This schema accepts no values.",
        suggestion: "Use a schema that accepts the intended value.",
      }),
    ]);
  }

  protected cloneWithChecks(checks: readonly Check<never>[]): BaseSchema<never> {
    return new NeverSchema(checks);
  }

  [describeSymbol](): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({ kind: "never" }));
  }
}

class ArraySchema<TItemOutput, TItemInput>
  extends BaseSchema<readonly TItemOutput[], readonly TItemInput[]>
{
  readonly kind = "array";
  private readonly constraints: ArrayConstraints;

  constructor(
    private readonly itemSchema: InternalSchema<TItemOutput, TItemInput>,
    constraints: ArrayConstraints = {},
    checks: readonly Check<readonly TItemOutput[]>[] = [],
  ) {
    super(checks);
    this.constraints = freezeLengthConstraints(constraints, "Array");
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<readonly TItemOutput[]> {
    if (!Array.isArray(input)) {
      return failure([
        context.issue({
          code: "invalid_type",
          expected: "array",
          received: input,
          message: "Expected an array.",
          suggestion: "Pass an array value.",
        }),
      ]);
    }

    const output: TItemOutput[] = [];
    const issues: Issue[] = [];

    if (this.constraints.minLength !== undefined && input.length < this.constraints.minLength) {
      issues.push(context.issue({
        code: "too_small",
        expected: `array length >= ${this.constraints.minLength}`,
        received: input,
        receivedDescription: `${input.length} items`,
        message: `Expected an array with at least ${this.constraints.minLength} items.`,
        suggestion: "Pass an array with more items.",
      }));
    }

    if (this.constraints.maxLength !== undefined && input.length > this.constraints.maxLength) {
      issues.push(context.issue({
        code: "too_large",
        expected: `array length <= ${this.constraints.maxLength}`,
        received: input,
        receivedDescription: `${input.length} items`,
        message: `Expected an array with at most ${this.constraints.maxLength} items.`,
        suggestion: "Pass an array with fewer items.",
      }));
    }

    input.forEach((item, index) => {
      const result = this.itemSchema[parseSymbol](item, context.child(index));

      if (result.success) {
        output.push(result.data);
      } else {
        issues.push(...result.error.issues);
      }
    });

    return issues.length === 0 ? success(Object.freeze(output)) : failure(issues);
  }

  protected cloneWithChecks(
    checks: readonly Check<readonly TItemOutput[]>[],
  ): BaseSchema<readonly TItemOutput[], readonly TItemInput[]> {
    return new ArraySchema(this.itemSchema, this.constraints, checks);
  }

  [describeSymbol](context?: DescribeContext): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({
      kind: "array",
      item: this.itemSchema[describeSymbol](context),
      ...describeConstraints(this.constraints),
    }));
  }
}

class TupleSchema<TItems extends readonly Schema<any, any>[]>
  extends BaseSchema<TupleOutput<TItems>, TupleInput<TItems>>
{
  readonly kind = "tuple";
  private readonly sourceItems: TItems;
  private readonly items: readonly InternalSchema<unknown, unknown>[];

  constructor(
    items: TItems,
    checks: readonly Check<TupleOutput<TItems>>[] = [],
  ) {
    super(checks);
    this.sourceItems = Object.freeze([...items]) as unknown as TItems;
    this.items = Object.freeze(this.sourceItems.map((item) => toInternalSchema(item)));
    Object.freeze(this);
  }

  protected parseBase(input: unknown, context: ParseContext): ParseResult<TupleOutput<TItems>> {
    if (!Array.isArray(input)) {
      return failure([
        context.issue({
          code: "invalid_type",
          expected: "tuple",
          received: input,
          message: "Expected a tuple array.",
          suggestion: "Pass an array with the expected item count.",
        }),
      ]);
    }

    if (input.length !== this.items.length) {
      return failure([
        context.issue({
          code: "invalid_tuple_length",
          expected: `${this.items.length} items`,
          received: input,
          receivedDescription: `${input.length} items`,
          message: `Expected tuple with ${this.items.length} items.`,
          suggestion: `Pass exactly ${this.items.length} items.`,
        }),
      ]);
    }

    const output: unknown[] = [];
    const issues: Issue[] = [];

    input.forEach((item, index) => {
      const schema = this.items[index]!;
      const result = schema[parseSymbol](item, context.child(index));

      if (result.success) {
        output[index] = result.data;
      } else {
        issues.push(...result.error.issues);
      }
    });

    return issues.length === 0
      ? success(Object.freeze(output) as TupleOutput<TItems>)
      : failure(issues);
  }

  protected cloneWithChecks(
    checks: readonly Check<TupleOutput<TItems>>[],
  ): BaseSchema<TupleOutput<TItems>, TupleInput<TItems>> {
    return new TupleSchema(this.sourceItems, checks);
  }

  [describeSymbol](context?: DescribeContext): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({
      kind: "tuple",
      items: Object.freeze(this.items.map((item) => item[describeSymbol](context))),
    }));
  }
}

class UnionSchema<
  TSchemas extends readonly [Schema<any, any>, ...Schema<any, any>[]],
> extends BaseSchema<InferOutput<TSchemas[number]>, InferInput<TSchemas[number]>>
{
  readonly kind = "union";
  private readonly sourceChoices: TSchemas;
  private readonly choices: readonly InternalSchema<
    InferOutput<TSchemas[number]>,
    InferInput<TSchemas[number]>
  >[];

  constructor(
    choices: TSchemas,
    checks: readonly Check<InferOutput<TSchemas[number]>>[] = [],
  ) {
    super(checks);
    this.sourceChoices = Object.freeze([...choices]) as unknown as TSchemas;
    this.choices = Object.freeze(
      this.sourceChoices.map((choice) => toInternalSchema(choice)) as InternalSchema<
        InferOutput<TSchemas[number]>,
        InferInput<TSchemas[number]>
      >[],
    );
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<InferOutput<TSchemas[number]>> {
    const branches: UnionIssueBranch[] = [];

    for (const [index, choice] of this.choices.entries()) {
      const result = choice[parseSymbol](input, context);

      if (result.success) {
        return result;
      }

      branches.push({ index, issues: result.error.issues });
    }

    return failure([
      context.issue({
        code: "invalid_union",
        expected: describeUnionExpected(this.choices),
        received: input,
        message: "Expected input to match one union choice.",
        suggestion: "Pass a value that satisfies one of the union schemas.",
        branches,
      }),
    ]);
  }

  protected cloneWithChecks(
    checks: readonly Check<InferOutput<TSchemas[number]>>[],
  ): BaseSchema<InferOutput<TSchemas[number]>, InferInput<TSchemas[number]>> {
    return new UnionSchema(this.sourceChoices, checks);
  }

  [describeSymbol](context?: DescribeContext): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({
      kind: "union",
      choices: Object.freeze(
        this.choices.map((choice) => choice[describeSymbol](context)),
      ),
    }));
  }
}

class DiscriminatedUnionSchema<
  TChoices extends DiscriminatedUnionChoices,
> extends BaseSchema<InferOutput<TChoices[number]>, InferInput<TChoices[number]>>
{
  readonly kind = "discriminatedUnion";
  private readonly sourceChoices: TChoices;
  private readonly choicesByValue: ReadonlyMap<
    EnumValue,
    InternalSchema<InferOutput<TChoices[number]>, InferInput<TChoices[number]>>
  >;
  private readonly expected: string;

  constructor(
    private readonly discriminator: string,
    choices: TChoices,
    checks: readonly Check<InferOutput<TChoices[number]>>[] = [],
  ) {
    super(checks);
    if (typeof discriminator !== "string") {
      throw new TypeError("Discriminated union discriminator must be a string.");
    }
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new TypeError("Discriminated union choices must be a non-empty array.");
    }

    this.sourceChoices = Object.freeze([...choices]) as unknown as TChoices;
    const choicesByValue = new Map<
      EnumValue,
      InternalSchema<InferOutput<TChoices[number]>, InferInput<TChoices[number]>>
    >();
    const discriminatorValues: EnumValue[] = [];

    for (const choice of this.sourceChoices) {
      const internalChoice = toInternalSchema(choice) as InternalSchema<
        InferOutput<TChoices[number]>,
        InferInput<TChoices[number]>
      >;
      const definition = internalChoice[describeSymbol]();
      if (definition.kind !== "object") {
        throw new TypeError("Discriminated union choices must be object schemas.");
      }
      if (!definition.required.includes(discriminator)) {
        throw new TypeError(
          `Discriminated union property ${JSON.stringify(discriminator)} must be required.`,
        );
      }

      const discriminatorDefinition = definition.shape[discriminator];
      const values = discriminatorDefinition === undefined
        ? undefined
        : discriminatorValuesFromDefinition(discriminatorDefinition);
      if (values === undefined) {
        throw new TypeError(
          `Discriminated union property ${JSON.stringify(discriminator)} must be a string or finite-number literal or enum.`,
        );
      }

      for (const value of values) {
        if (choicesByValue.has(value)) {
          throw new TypeError(
            `Discriminated union value ${describeLiteral(value)} must be unique.`,
          );
        }
        choicesByValue.set(value, internalChoice);
        discriminatorValues.push(value);
      }
    }

    this.choicesByValue = choicesByValue;
    this.expected = discriminatorValues.map(describeLiteral).join(" | ");
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<InferOutput<TChoices[number]>> {
    if (!isRecord(input)) {
      return failure([
        context.issue({
          code: "invalid_type",
          expected: "object",
          received: input,
          message: "Expected an object for a discriminated union.",
          suggestion: `Pass an object with discriminator ${JSON.stringify(this.discriminator)}.`,
        }),
      ]);
    }

    const value = input[this.discriminator];
    const choice = typeof value === "string" || typeof value === "number"
      ? this.choicesByValue.get(value)
      : undefined;
    if (choice === undefined) {
      return failure([
        context.child(this.discriminator).issue({
          code: "invalid_discriminator",
          expected: this.expected,
          received: value,
          message: `Expected discriminator ${JSON.stringify(this.discriminator)} to match one declared choice.`,
          suggestion: `Pass one of the declared discriminator values: ${this.expected}.`,
        }),
      ]);
    }

    return choice[parseSymbol](input, context);
  }

  protected cloneWithChecks(
    checks: readonly Check<InferOutput<TChoices[number]>>[],
  ): BaseSchema<InferOutput<TChoices[number]>, InferInput<TChoices[number]>> {
    return new DiscriminatedUnionSchema(this.discriminator, this.sourceChoices, checks);
  }

  [describeSymbol](context?: DescribeContext): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({
      kind: "discriminatedUnion",
      discriminator: this.discriminator,
      choices: Object.freeze(
        this.sourceChoices.map((choice) => toInternalSchema(choice)[describeSymbol](context)),
      ),
    }));
  }
}

class IntersectionSchema<
  TLeft extends Schema<any, any>,
  TRight extends Schema<any, any>,
> extends BaseSchema<
  InferOutput<TLeft> & InferOutput<TRight>,
  InferInput<TLeft> & InferInput<TRight>
> {
  readonly kind = "intersection";
  private readonly left: InternalSchema<InferOutput<TLeft>, InferInput<TLeft>>;
  private readonly right: InternalSchema<InferOutput<TRight>, InferInput<TRight>>;

  constructor(
    private readonly sourceLeft: TLeft,
    private readonly sourceRight: TRight,
    checks: readonly Check<InferOutput<TLeft> & InferOutput<TRight>>[] = [],
  ) {
    super(checks);
    this.left = toInternalSchema(sourceLeft);
    this.right = toInternalSchema(sourceRight);
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<InferOutput<TLeft> & InferOutput<TRight>> {
    const leftResult = this.left[parseSymbol](input, context);
    const rightResult = this.right[parseSymbol](input, context);

    if (!leftResult.success || !rightResult.success) {
      return failure([
        ...(leftResult.success ? [] : leftResult.error.issues),
        ...(rightResult.success ? [] : rightResult.error.issues),
      ]);
    }

    const merged = mergeIntersectionOutputs(leftResult.data, rightResult.data);
    if (!merged.success) {
      return failure([
        context.issue({
          code: "intersection_conflict",
          expected: "compatible intersection outputs",
          received: input,
          message: "Intersection schemas produced incompatible outputs.",
          suggestion: "Use schemas whose successful outputs agree or can be merged recursively.",
        }),
      ]);
    }

    return success(merged.data as InferOutput<TLeft> & InferOutput<TRight>);
  }

  protected cloneWithChecks(
    checks: readonly Check<InferOutput<TLeft> & InferOutput<TRight>>[],
  ): BaseSchema<
    InferOutput<TLeft> & InferOutput<TRight>,
    InferInput<TLeft> & InferInput<TRight>
  > {
    return new IntersectionSchema(this.sourceLeft, this.sourceRight, checks);
  }

  [describeSymbol](context?: DescribeContext): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({
      kind: "intersection",
      left: this.left[describeSymbol](context),
      right: this.right[describeSymbol](context),
    }));
  }
}

class ObjectSchema<
  TShape extends Shape,
  TPolicy extends UnknownPropertyPolicy,
> extends BaseSchema<
  ObjectOutputWithPolicy<TShape, TPolicy>,
  ObjectInputWithPolicy<TShape, TPolicy>
>
{
  readonly kind = "object";
  private readonly shape: Readonly<TShape>;
  private readonly unknownProperties: TPolicy;

  constructor(
    shape: TShape,
    options: ObjectOptions<TPolicy>,
    checks: readonly Check<ObjectOutputWithPolicy<TShape, TPolicy>>[] = [],
  ) {
    super(checks);
    this.shape = Object.freeze({ ...shape });
    this.unknownProperties = parseUnknownPropertyPolicy(options.unknownProperties) as TPolicy;
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<ObjectOutputWithPolicy<TShape, TPolicy>> {
    if (!isRecord(input)) {
      return failure([
        context.issue({
          code: "invalid_type",
          expected: "object",
          received: input,
          message: "Expected an object.",
          suggestion: "Pass a non-array object value.",
        }),
      ]);
    }

    const output: Record<string, unknown> = {};
    const issues: Issue[] = [];
    const inputKeys = new Set(Object.keys(input));

    for (const [key, schema] of Object.entries(this.shape)) {
      const childSchema = toInternalSchema(schema);
      const childContext = context.child(key);

      if (!Object.prototype.hasOwnProperty.call(input, key)) {
        if (isOptionalSchema(childSchema)) {
          continue;
        }

        issues.push(
          childContext.issue({
            code: "missing_property",
            expected: childSchema.kind,
            received: undefined,
            message: `Missing required property "${key}".`,
            suggestion: `Add "${key}" with a ${childSchema.kind} value.`,
          }),
        );
        continue;
      }

      const result = childSchema[parseSymbol](input[key], childContext);

      if (result.success) {
        if (!(isOptionalSchema(childSchema) && result.data === undefined)) {
          defineRecordValue(output, key, result.data);
        }
      } else {
        issues.push(...result.error.issues);
      }

      inputKeys.delete(key);
    }

    for (const key of inputKeys) {
      if (this.unknownProperties === "strip") continue;
      if (this.unknownProperties === "passthrough") {
        defineRecordValue(output, key, input[key]);
        continue;
      }

      const childContext = context.child(key);

      issues.push(
        childContext.issue({
          code: "unexpected_property",
          expected: "no additional property",
          received: input[key],
          message: `Unexpected property "${key}".`,
          suggestion: `Remove "${key}" or add it to the schema.`,
        }),
      );
    }

    return issues.length === 0
      ? success(Object.freeze(output) as ObjectOutputWithPolicy<TShape, TPolicy>)
      : failure(issues);
  }

  protected cloneWithChecks(
    checks: readonly Check<ObjectOutputWithPolicy<TShape, TPolicy>>[],
  ): BaseSchema<
    ObjectOutputWithPolicy<TShape, TPolicy>,
    ObjectInputWithPolicy<TShape, TPolicy>
  > {
    return new ObjectSchema(
      this.shape as TShape,
      { unknownProperties: this.unknownProperties },
      checks,
    );
  }

  [describeSymbol](context?: DescribeContext): SchemaDefinition {
    const shape: Record<string, SchemaDefinition> = {};
    const required: string[] = [];

    for (const [key, schema] of Object.entries(this.shape)) {
      const childSchema = toInternalSchema(schema);
      shape[key] = childSchema[describeSymbol](context);

      if (!isOptionalSchema(childSchema)) {
        required.push(key);
      }
    }

    return this.describeWithRefinements(Object.freeze({
      kind: "object",
      shape: Object.freeze(shape),
      required: Object.freeze(required),
      unknownProperties: this.unknownProperties,
    }));
  }
}

class RecordSchema<TValueOutput, TValueInput>
  extends BaseSchema<
    Readonly<Record<string, TValueOutput>>,
    Readonly<Record<string, TValueInput>>
  >
{
  readonly kind = "record";
  private readonly constraints: RecordConstraints;
  private readonly keySchema: InternalSchema<string, string> | undefined;

  constructor(
    private readonly valueSchema: InternalSchema<TValueOutput, TValueInput>,
    constraints: RecordConstraints = {},
    checks: readonly Check<Readonly<Record<string, TValueOutput>>>[] = [],
  ) {
    super(checks);
    this.constraints = freezeRecordConstraints(constraints);
    this.keySchema = this.constraints.key === undefined
      ? undefined
      : new StringSchema(this.constraints.key);
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<Readonly<Record<string, TValueOutput>>> {
    if (!isRecord(input)) {
      return failure([
        context.issue({
          code: "invalid_type",
          expected: "record",
          received: input,
          message: "Expected a record object.",
          suggestion: "Pass a non-array object value.",
        }),
      ]);
    }

    const output: Record<string, TValueOutput> = {};
    const issues: Issue[] = [];

    for (const [key, value] of Object.entries(input)) {
      const childContext = context.child(key);
      const keyResult = this.keySchema?.[parseSymbol](key, childContext);
      if (keyResult !== undefined && !keyResult.success) {
        issues.push(...keyResult.error.issues);
      }

      const result = this.valueSchema[parseSymbol](value, childContext);

      if (result.success) {
        defineRecordValue(output, key, result.data);
      } else {
        issues.push(...result.error.issues);
      }
    }

    return issues.length === 0
      ? success(Object.freeze(output))
      : failure(issues);
  }

  protected cloneWithChecks(
    checks: readonly Check<Readonly<Record<string, TValueOutput>>>[],
  ): BaseSchema<
    Readonly<Record<string, TValueOutput>>,
    Readonly<Record<string, TValueInput>>
  > {
    return new RecordSchema(this.valueSchema, this.constraints, checks);
  }

  [describeSymbol](context?: DescribeContext): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({
      kind: "record",
      ...(this.constraints.key === undefined ? {} : { key: this.constraints.key }),
      value: this.valueSchema[describeSymbol](context),
    }));
  }
}

class NullableSchema<TOutput, TInput>
  extends BaseSchema<TOutput | null, TInput | null>
{
  readonly kind = "nullable";

  constructor(
    private readonly innerSchema: InternalSchema<TOutput, TInput>,
    checks: readonly Check<TOutput | null>[] = [],
  ) {
    super(checks);
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<TOutput | null> {
    if (input === null) {
      return success(null);
    }

    return this.innerSchema[parseSymbol](input, context);
  }

  protected cloneWithChecks(
    checks: readonly Check<TOutput | null>[],
  ): BaseSchema<TOutput | null, TInput | null> {
    return new NullableSchema(this.innerSchema, checks);
  }

  [describeSymbol](context?: DescribeContext): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({
      kind: "nullable",
      inner: this.innerSchema[describeSymbol](context),
    }));
  }
}

class OptionalSchema<TOutput, TInput>
  extends BaseSchema<TOutput | undefined, TInput | undefined>
{
  readonly kind = "optional";
  readonly [optionalSymbol] = true;

  constructor(
    private readonly innerSchema: InternalSchema<TOutput, TInput>,
    checks: readonly Check<TOutput | undefined>[] = [],
  ) {
    super(checks);
    Object.freeze(this);
  }

  override annotate(
    metadata: SchemaMetadata,
  ): OptionalSchemaType<TOutput | undefined, TInput | undefined> {
    return new AnnotatedSchema(this, metadata) as unknown as OptionalSchemaType<
      TOutput | undefined,
      TInput | undefined
    >;
  }

  override refine(
    predicate: Refinement<TOutput | undefined>,
    options: RefinementOptions = {},
  ): OptionalSchemaType<TOutput | undefined, TInput | undefined> {
    return this.cloneWithChecks([
      ...this.checks,
      createCheck(predicate, options),
    ]) as unknown as OptionalSchemaType<TOutput | undefined, TInput | undefined>;
  }

  override refineWithIssues(
    collector: CustomRefinement<TOutput | undefined>,
    options: CustomRefinementOptions,
  ): OptionalSchemaType<TOutput | undefined, TInput | undefined> {
    return this.cloneWithChecks([
      ...this.checks,
      createCollectorCheck(collector, options),
    ]) as unknown as OptionalSchemaType<TOutput | undefined, TInput | undefined>;
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<TOutput | undefined> {
    if (input === undefined) {
      return success(undefined);
    }

    return this.innerSchema[parseSymbol](input, context);
  }

  protected cloneWithChecks(
    checks: readonly Check<TOutput | undefined>[],
  ): BaseSchema<TOutput | undefined, TInput | undefined> {
    return new OptionalSchema(this.innerSchema, checks);
  }

  [describeSymbol](context?: DescribeContext): SchemaDefinition {
    return this.describeWithRefinements(Object.freeze({
      kind: "optional",
      inner: this.innerSchema[describeSymbol](context),
    }));
  }
}

class LazySchema<TOutput, TInput> extends BaseSchema<TOutput, TInput> {
  readonly kind = "lazy";
  private readonly id: string;
  private readonly getSchema: () => Schema<TOutput, TInput>;
  private readonly resolveSchema: () => InternalSchema<TOutput, TInput>;

  constructor(
    getSchema: () => Schema<TOutput, TInput>,
    options: LazyOptions,
    checks: readonly Check<TOutput>[] = [],
  ) {
    super(checks);
    this.id = validateStableSchemaId(options?.id, "Lazy schema");
    this.getSchema = getSchema;

    let resolved: InternalSchema<TOutput, TInput> | undefined;
    this.resolveSchema = () => {
      if (resolved !== undefined) {
        return resolved;
      }

      const candidate = this.getSchema();

      if (candidate instanceof LazySchema) {
        throw new TypeError(
          `Lazy schema "${this.id}" must resolve through a concrete schema.`,
        );
      }

      if (!isInternalSchema(candidate)) {
        throw new TypeError(
          `Lazy schema "${this.id}" getter must return a SafeShape schema.`,
        );
      }

      resolved = candidate;
      return resolved;
    };
    Object.freeze(this);
  }

  protected parseBase(input: unknown, context: ParseContext): ParseResult<TOutput> {
    return this.resolveSchema()[parseSymbol](input, context);
  }

  protected cloneWithChecks(
    checks: readonly Check<TOutput>[],
  ): BaseSchema<TOutput, TInput> {
    return new LazySchema(this.getSchema, { id: this.id }, checks);
  }

  [describeSymbol](context?: DescribeContext): SchemaDefinition {
    const reference = this.describeWithRefinements(Object.freeze({
      kind: "reference",
      id: this.id,
    }));

    if (context === undefined) {
      return reference;
    }

    const owner = context.owners.get(this.id);

    if (owner !== undefined && owner !== this) {
      throw new TypeError(`Duplicate lazy schema id: ${this.id}`);
    }

    context.owners.set(this.id, this);

    if (context.definitions.has(this.id) || context.resolving.has(this.id)) {
      return reference;
    }

    context.resolving.add(this.id);
    try {
      context.definitions.set(
        this.id,
        this.resolveSchema()[describeSymbol](context),
      );
    } finally {
      context.resolving.delete(this.id);
    }

    return reference;
  }
}

class TransformSchema<TInnerOutput, TOutput, TInput>
  extends BaseSchema<TOutput, TInput>
{
  readonly kind = "transform";

  constructor(
    private readonly innerSchema: InternalSchema<TInnerOutput, TInput>,
    private readonly mapper: Transform<TInnerOutput, TOutput>,
    private readonly options: TransformOptions = {},
    checks: readonly Check<TOutput>[] = [],
  ) {
    super(checks);
    this.options = freezeTransformOptions(options);
    Object.freeze(this);
  }

  protected parseBase(input: unknown, context: ParseContext): ParseResult<TOutput> {
    const result = this.innerSchema[parseSymbol](input, context);

    if (!result.success) {
      return result;
    }

    try {
      return success(this.mapper(result.data));
    } catch {
      return failure([
        context.issue({
          code: "transform_failed",
          expected: this.options.expected ?? "successful transform",
          received: input,
          message: this.options.message ?? "Transform failed.",
          suggestion: this.options.suggestion,
        }),
      ]);
    }
  }

  protected cloneWithChecks(checks: readonly Check<TOutput>[]): BaseSchema<TOutput, TInput> {
    return new TransformSchema(this.innerSchema, this.mapper, this.options, checks);
  }

  [describeSymbol](context?: DescribeContext): SchemaDefinition {
    if (context?.side === "output") {
      return this.describeWithRefinements(Object.freeze({
        kind: "opaque",
        behavior: "transform",
        ...(this.options.id === undefined ? {} : { id: this.options.id }),
      }));
    }

    return this.describeWithRefinements(Object.freeze({
      kind: "transform",
      inner: this.innerSchema[describeSymbol](context),
      ...(this.options.id === undefined ? {} : { id: this.options.id }),
    }));
  }
}

class AnnotatedSchema<TOutput, TInput> extends BaseSchema<TOutput, TInput> {
  readonly kind: string;
  readonly [optionalSymbol]?: true;
  private readonly metadata: SchemaMetadata;

  constructor(
    private readonly innerSchema: InternalSchema<TOutput, TInput>,
    metadata: SchemaMetadata,
    checks: readonly Check<TOutput>[] = [],
  ) {
    super(checks);
    this.kind = innerSchema.kind;
    if (isOptionalSchema(innerSchema)) {
      this[optionalSymbol] = true;
    }
    this.metadata = freezeSchemaMetadata(metadata);
    Object.freeze(this);
  }

  protected parseBase(input: unknown, context: ParseContext): ParseResult<TOutput> {
    return this.innerSchema[parseSymbol](input, context);
  }

  protected cloneWithChecks(checks: readonly Check<TOutput>[]): BaseSchema<TOutput, TInput> {
    return new AnnotatedSchema(this.innerSchema, this.metadata, checks);
  }

  [describeSymbol](context?: DescribeContext): SchemaDefinition {
    return this.describeWithRefinements(
      annotateDefinition(this.innerSchema[describeSymbol](context), this.metadata),
    );
  }
}

export function string(constraints: StringConstraints = {}): Schema<string> {
  return new StringSchema(constraints);
}

export function number(constraints: NumberConstraints = {}): Schema<number> {
  return new NumberSchema(constraints);
}

export function integer(constraints: IntegerConstraints = {}): Schema<number> {
  return new NumberSchema({ ...constraints, integer: true });
}

export function boolean(): Schema<boolean> {
  return new BooleanSchema();
}

export function literal<T extends LiteralValue>(
  value: T,
): Schema<T> {
  return new LiteralSchema(value);
}

export function enumeration<const TValues extends EnumValues>(
  values: TValues,
): Schema<TValues[number]> {
  return new EnumSchema(values);
}

export { enumeration as enum };

export function unknown(): Schema<unknown> {
  return new UnknownSchema();
}

export function never(): Schema<never> {
  return new NeverSchema();
}

export function array<TSchema extends Schema<any, any>>(
  itemSchema: TSchema,
  constraints: ArrayConstraints = {},
): Schema<readonly InferOutput<TSchema>[], readonly InferInput<TSchema>[]> {
  return new ArraySchema<InferOutput<TSchema>, InferInput<TSchema>>(
    toInternalSchema(itemSchema),
    constraints,
  );
}

export function tuple<const TItems extends readonly Schema<any, any>[]>(
  items: TItems,
): Schema<TupleOutput<TItems>, TupleInput<TItems>> {
  return new TupleSchema(items);
}

export function union<
  const TSchemas extends readonly [Schema<any, any>, ...Schema<any, any>[]],
>(
  choices: TSchemas,
): Schema<InferOutput<TSchemas[number]>, InferInput<TSchemas[number]>> {
  return new UnionSchema(choices);
}

export function discriminatedUnion<
  const TChoices extends DiscriminatedUnionChoices,
>(
  discriminator: string,
  choices: TChoices,
): Schema<InferOutput<TChoices[number]>, InferInput<TChoices[number]>> {
  return new DiscriminatedUnionSchema(discriminator, choices);
}

export function intersection<
  TLeft extends Schema<any, any>,
  TRight extends Schema<any, any>,
>(
  left: TLeft,
  right: TRight,
): Schema<
  InferOutput<TLeft> & InferOutput<TRight>,
  InferInput<TLeft> & InferInput<TRight>
> {
  return new IntersectionSchema(left, right);
}

export function object<
  TShape extends Shape,
  TPolicy extends UnknownPropertyPolicy = "reject",
>(
  shape: TShape,
  options: ObjectOptions<TPolicy> = {},
): Schema<
  ObjectOutputWithPolicy<TShape, TPolicy>,
  ObjectInputWithPolicy<TShape, TPolicy>
> {
  return new ObjectSchema(shape, options);
}

export function record<TValueSchema extends Schema<any, any>>(
  valueSchema: TValueSchema,
  constraints: RecordConstraints = {},
): Schema<RecordOutput<TValueSchema>, RecordInput<TValueSchema>> {
  return new RecordSchema<InferOutput<TValueSchema>, InferInput<TValueSchema>>(
    toInternalSchema(valueSchema),
    constraints,
  );
}

export function nullable<TSchema extends Schema<any, any>>(
  schema: TSchema,
): Schema<InferOutput<TSchema> | null, InferInput<TSchema> | null> {
  return schema.nullable();
}

export function optional<TSchema extends Schema<any, any>>(
  schema: TSchema,
): OptionalSchemaType<
  InferOutput<TSchema> | undefined,
  InferInput<TSchema> | undefined
> {
  return schema.optional();
}

export function lazy<TOutput, TInput = TOutput>(
  getSchema: () => Schema<TOutput, TInput>,
  options: LazyOptions,
): Schema<TOutput, TInput> {
  if (typeof getSchema !== "function") {
    throw new TypeError("Lazy schema getter must be a function.");
  }

  return new LazySchema(getSchema, options);
}

export function annotate<TSchema extends Schema<any, any>>(
  schema: TSchema,
  metadata: SchemaMetadata,
): TSchema extends OptionalSchemaType<infer TOutput, infer TInput>
  ? OptionalSchemaType<TOutput, TInput>
  : Schema<InferOutput<TSchema>, InferInput<TSchema>> {
  return schema.annotate(metadata) as TSchema extends OptionalSchemaType<
    infer TOutput,
    infer TInput
  >
    ? OptionalSchemaType<TOutput, TInput>
    : Schema<InferOutput<TSchema>, InferInput<TSchema>>;
}

export function describeSchema(schema: Schema<any, any>): SchemaDefinition {
  return toInternalSchema(schema)[describeSymbol]();
}

export function describeContract(
  schema: Schema<any, any>,
): SchemaContractDescription {
  return Object.freeze({
    format: SCHEMA_CONTRACT_FORMAT,
    input: describeContractGraph(schema, "input"),
    output: describeContractGraph(schema, "output"),
  });
}

function describeContractGraph(
  schema: Schema<any, any>,
  side: ContractSide,
): SchemaContractGraph {
  const context: DescribeContext = {
    side,
    definitions: new Map(),
    owners: new Map(),
    resolving: new Set(),
  };
  const root = toInternalSchema(schema)[describeSymbol](context);
  const definitions: Record<string, SchemaDefinition> = {};

  for (const id of [...context.definitions.keys()].sort()) {
    definitions[id] = canonicalizeDefinition(context.definitions.get(id)!);
  }

  return Object.freeze({
    root: canonicalizeDefinition(root),
    definitions: Object.freeze(definitions),
  });
}

export const schema = Object.freeze({
  string,
  number,
  integer,
  boolean,
  literal,
  enum: enumeration,
  unknown,
  never,
  array,
  tuple,
  union,
  discriminatedUnion,
  intersection,
  object,
  record,
  nullable,
  optional,
  lazy,
  annotate,
});

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function toInternalSchema<TOutput, TInput>(
  schemaValue: Schema<TOutput, TInput>,
): InternalSchema<TOutput, TInput> {
  return schemaValue as InternalSchema<TOutput, TInput>;
}

function isInternalSchema(value: unknown): value is InternalSchema<any, any> {
  return typeof value === "object" &&
    value !== null &&
    parseSymbol in value &&
    describeSymbol in value;
}

function isOptionalSchema(schemaValue: InternalSchema<unknown, unknown>): boolean {
  return schemaValue[optionalSymbol] === true;
}

function describeUnionExpected(choices: readonly Schema<unknown, unknown>[]): string {
  return choices.map((choice) => choice.kind).join(" | ");
}

function discriminatorValuesFromDefinition(
  definition: SchemaDefinition,
): readonly EnumValue[] | undefined {
  if (definition.kind === "enum") {
    return definition.values;
  }
  if (definition.kind !== "literal") {
    return undefined;
  }

  const value = definition.value;
  if (typeof value === "string") {
    return Object.freeze([value]);
  }
  if (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0)) {
    return Object.freeze([value]);
  }
  return undefined;
}

type IntersectionMergeResult =
  | { readonly success: true; readonly data: unknown }
  | { readonly success: false };

function mergeIntersectionOutputs(left: unknown, right: unknown): IntersectionMergeResult {
  if (Object.is(left, right)) {
    return { success: true, data: left };
  }

  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) return { success: false };
    const output: unknown[] = [];
    for (let index = 0; index < left.length; index += 1) {
      const merged = mergeIntersectionOutputs(left[index], right[index]);
      if (!merged.success) return merged;
      output.push(merged.data);
    }
    return { success: true, data: Object.freeze(output) };
  }

  if (isPlainRecord(left) && isPlainRecord(right)) {
    const output: Record<string, unknown> = {};
    const keys = [...new Set([...Object.keys(left), ...Object.keys(right)])].sort();
    for (const key of keys) {
      const hasLeft = Object.prototype.hasOwnProperty.call(left, key);
      const hasRight = Object.prototype.hasOwnProperty.call(right, key);
      if (hasLeft && hasRight) {
        const merged = mergeIntersectionOutputs(left[key], right[key]);
        if (!merged.success) return merged;
        defineRecordValue(output, key, merged.data);
      } else {
        defineRecordValue(output, key, hasLeft ? left[key] : right[key]);
      }
    }
    return { success: true, data: Object.freeze(output) };
  }

  return { success: false };
}

function isPlainRecord(input: unknown): input is Record<string, unknown> {
  if (!isRecord(input)) return false;
  const prototype = Object.getPrototypeOf(input);
  return prototype === Object.prototype || prototype === null;
}

function defineRecordValue(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    value,
    writable: true,
  });
}

function freezeEnumValues(values: EnumValues): readonly EnumValue[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new TypeError("Enum schema values must be a non-empty array.");
  }

  const frozenValues: EnumValue[] = [];

  for (const value of values) {
    if (typeof value !== "string" && (typeof value !== "number" || !Number.isFinite(value))) {
      throw new TypeError("Enum schema values must be strings or finite numbers.");
    }
    if (typeof value === "number" && Object.is(value, -0)) {
      throw new TypeError("Enum schema values must not contain negative zero.");
    }
    if (frozenValues.some((existing) => Object.is(existing, value))) {
      throw new TypeError(`Enum schema values must be unique: ${describeLiteral(value)}.`);
    }
    frozenValues.push(value);
  }

  return Object.freeze(frozenValues);
}

function canonicalizeEnumValues(values: readonly EnumValue[]): readonly EnumValue[] {
  return Object.freeze([...values].sort(compareEnumValues));
}

function compareEnumValues(left: EnumValue, right: EnumValue): number {
  if (typeof left !== typeof right) return typeof left === "string" ? -1 : 1;
  if (typeof left === "number" && typeof right === "number") return left - right;
  return left < right ? -1 : left > right ? 1 : 0;
}

function createCheck<T>(predicate: Refinement<T>, options: RefinementOptions): Check<T> {
  return Object.freeze({
    kind: "predicate",
    predicate,
    options: freezeRefinementOptions(options),
  });
}

function cloneCheck<T>(check: Check<T>): Check<T> {
  return check.kind === "predicate"
    ? createCheck(check.predicate, check.options)
    : createCollectorCheck(check.collector, check.options);
}

function createCollectorCheck<T>(
  collector: CustomRefinement<T>,
  options: CustomRefinementOptions,
): Check<T> {
  if (typeof collector !== "function") {
    throw new TypeError("Custom refinement collector must be a function.");
  }

  return Object.freeze({
    kind: "collector",
    collector,
    options: freezeCustomRefinementOptions(options),
  });
}

function freezeRefinementOptions(options: RefinementOptions): RefinementOptions {
  return Object.freeze({
    ...(options.id === undefined ? {} : { id: validateOpaqueId(options.id) }),
    ...(options.path === undefined ? {} : { path: validateRelativeIssuePath(options.path) }),
    ...(options.message === undefined ? {} : { message: options.message }),
    ...(options.expected === undefined ? {} : { expected: options.expected }),
    ...(options.suggestion === undefined ? {} : { suggestion: options.suggestion }),
  });
}

function freezeCustomRefinementOptions(
  options: CustomRefinementOptions,
): CustomRefinementOptions {
  if (options === undefined || options === null || typeof options !== "object") {
    throw new TypeError("Custom refinement options with a stable id are required.");
  }

  return Object.freeze({ id: validateOpaqueId(options.id) });
}

function validateRelativeIssuePath(
  path: readonly IssuePathSegment[] | undefined,
): readonly IssuePathSegment[] {
  if (path === undefined) return Object.freeze([]);
  if (!Array.isArray(path) || path.some((segment) =>
    typeof segment !== "string" &&
    (typeof segment !== "number" || !Number.isSafeInteger(segment) || segment < 0))) {
    throw new TypeError("Custom issue path must contain only strings or non-negative safe integers.");
  }
  return Object.freeze([...path]);
}

function validateIssueMessage(message: unknown): string {
  if (typeof message !== "string" || message.length === 0) {
    throw new TypeError("Custom issue message must be a non-empty string.");
  }
  return message;
}

function validateOptionalIssueText(value: unknown, label: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string.`);
  }
  return value;
}

function valueAtRelativePath(value: unknown, path: readonly IssuePathSegment[]): unknown {
  let current = value;

  for (const segment of path) {
    if (current === null || (typeof current !== "object" && typeof current !== "function")) {
      return undefined;
    }
    try {
      current = (current as Record<PropertyKey, unknown>)[segment];
    } catch {
      return undefined;
    }
  }

  return current;
}

function isPromiseLike(value: unknown): boolean {
  if (value === null || (typeof value !== "object" && typeof value !== "function")) return false;
  try {
    return typeof (value as { readonly then?: unknown }).then === "function";
  } catch {
    return false;
  }
}

function createCollectorExecutionIssue(
  id: string,
  received: unknown,
  context: ParseContext,
  message: string,
): Issue {
  return context.issue({
    code: "custom",
    expected: `successful custom rule ${JSON.stringify(id)}`,
    received,
    message,
  });
}

function freezeTransformOptions(options: TransformOptions): TransformOptions {
  return Object.freeze({
    ...(options.id === undefined ? {} : { id: validateOpaqueId(options.id) }),
    ...(options.message === undefined ? {} : { message: options.message }),
    ...(options.expected === undefined ? {} : { expected: options.expected }),
    ...(options.suggestion === undefined ? {} : { suggestion: options.suggestion }),
  });
}

function validateOpaqueId(id: unknown): string {
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new TypeError("Opaque behavior id must not be empty.");
  }

  return id;
}

function validateStableSchemaId(id: unknown, label: string): string {
  if (typeof id !== "string" || id.length === 0) {
    throw new TypeError(`${label} id must be a non-empty string.`);
  }

  if (id.trim() !== id) {
    throw new TypeError(`${label} id must not contain surrounding whitespace.`);
  }

  return id;
}

function freezeSchemaMetadata(metadata: SchemaMetadata): SchemaMetadata {
  return Object.freeze({
    ...(metadata.title === undefined ? {} : { title: metadata.title }),
    ...(metadata.description === undefined ? {} : { description: metadata.description }),
    ...(metadata.examples === undefined ? {} : { examples: Object.freeze([...metadata.examples]) }),
  });
}

function freezeLengthConstraints<TConstraints extends StringConstraints | ArrayConstraints>(
  constraints: TConstraints,
  label: "String" | "Array",
): TConstraints {
  const minLength = constraints.minLength;
  const maxLength = constraints.maxLength;

  if (minLength !== undefined) validateLengthConstraint(minLength, `${label} minLength`);
  if (maxLength !== undefined) validateLengthConstraint(maxLength, `${label} maxLength`);
  if (minLength !== undefined && maxLength !== undefined && minLength > maxLength) {
    throw new TypeError(`${label} minLength must not exceed maxLength.`);
  }

  return Object.freeze({
    ...(minLength === undefined ? {} : { minLength }),
    ...(maxLength === undefined ? {} : { maxLength }),
  }) as TConstraints;
}

function freezeStringConstraints(constraints: StringConstraints): StringConstraints {
  const lengths = freezeLengthConstraints(constraints, "String");
  const pattern = constraints.pattern;
  const format = constraints.format;

  if (pattern !== undefined) {
    if (typeof pattern !== "string") {
      throw new TypeError("String pattern must be a string.");
    }
    try {
      new RegExp(pattern, "u");
    } catch {
      throw new TypeError(
        "String pattern must be a valid ECMAScript regular expression in Unicode mode.",
      );
    }
  }

  if (format !== undefined && !isStringFormat(format)) {
    throw new TypeError(
      'String format must be one of "email", "uuid", "date", or "date-time".',
    );
  }

  return Object.freeze({
    ...lengths,
    ...(pattern === undefined ? {} : { pattern }),
    ...(format === undefined ? {} : { format }),
  });
}

function isStringFormat(value: unknown): value is StringFormat {
  return value === "email" || value === "uuid" || value === "date" || value === "date-time";
}

const EMAIL_FORMAT_PATTERN = /^(?=.{3,254}$)(?=.{1,64}@)[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+\/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)*$/u;
const UUID_FORMAT_PATTERN = /^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}$/u;
const DATE_FORMAT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const DATE_TIME_FORMAT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[Tt](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:[Zz]|([+-])(\d{2}):(\d{2}))$/u;

function matchesStringFormat(value: string, format: StringFormat): boolean {
  switch (format) {
    case "email":
      return EMAIL_FORMAT_PATTERN.test(value);
    case "uuid":
      return UUID_FORMAT_PATTERN.test(value);
    case "date": {
      const match = DATE_FORMAT_PATTERN.exec(value);
      return match !== null && isValidDateParts(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
      );
    }
    case "date-time": {
      const match = DATE_TIME_FORMAT_PATTERN.exec(value);
      if (match === null || !isValidDateParts(
        Number(match[1]),
        Number(match[2]),
        Number(match[3]),
      )) {
        return false;
      }

      const hour = Number(match[4]);
      const minute = Number(match[5]);
      const second = Number(match[6]);
      const offsetHour = match[8] === undefined ? 0 : Number(match[8]);
      const offsetMinute = match[9] === undefined ? 0 : Number(match[9]);
      return hour <= 23 && minute <= 59 && second <= 59 &&
        offsetHour <= 23 && offsetMinute <= 59;
    }
  }
}

function isValidDateParts(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const daysInMonth = month === 2
    ? (isLeapYear(year) ? 29 : 28)
    : month === 4 || month === 6 || month === 9 || month === 11
      ? 30
      : 31;
  return day <= daysInMonth;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function freezeNumberConstraints(constraints: NumberConstraints): NumberConstraints {
  const minimum = constraints.minimum;
  const maximum = constraints.maximum;
  const multipleOf = constraints.multipleOf;

  if (minimum !== undefined) validateFiniteConstraint(minimum, "Number minimum");
  if (maximum !== undefined) validateFiniteConstraint(maximum, "Number maximum");
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) {
    throw new TypeError("Number minimum must not exceed maximum.");
  }
  if (constraints.integer !== undefined && typeof constraints.integer !== "boolean") {
    throw new TypeError("Number integer must be a boolean.");
  }
  if (multipleOf !== undefined && (!Number.isFinite(multipleOf) || multipleOf <= 0)) {
    throw new TypeError("Number multipleOf must be a positive finite number.");
  }
  if (constraints.integer === true && minimum !== undefined && maximum !== undefined &&
      Math.ceil(minimum) > Math.floor(maximum)) {
    throw new TypeError("Integer minimum and maximum must include at least one integer.");
  }

  return Object.freeze({
    ...(minimum === undefined ? {} : { minimum }),
    ...(maximum === undefined ? {} : { maximum }),
    ...(constraints.integer === true ? { integer: true } : {}),
    ...(multipleOf === undefined ? {} : { multipleOf }),
  });
}

function freezeRecordConstraints(constraints: RecordConstraints): RecordConstraints {
  if (constraints.key === undefined) return Object.freeze({});
  const key = freezeStringConstraints(constraints.key);
  return Object.keys(key).length === 0
    ? Object.freeze({})
    : Object.freeze({ key });
}

function parseUnknownPropertyPolicy(
  value: UnknownPropertyPolicy | undefined,
): UnknownPropertyPolicy {
  if (value === undefined) return "reject";
  if (value === "reject" || value === "strip" || value === "passthrough") return value;
  throw new TypeError(
    'Object unknownProperties must be "reject", "strip", or "passthrough".',
  );
}

interface DecimalNumber {
  readonly coefficient: bigint;
  readonly scale: number;
}

function decimalNumber(value: number): DecimalNumber {
  const negative = value < 0;
  const [mantissa = "0", exponentText = "0"] = Math.abs(value)
    .toString()
    .toLowerCase()
    .split("e");
  const [whole = "0", fraction = ""] = mantissa.split(".");
  const exponent = Number(exponentText);
  let coefficient = BigInt(`${whole}${fraction}`);
  let scale = fraction.length - exponent;

  if (scale < 0) {
    coefficient *= 10n ** BigInt(-scale);
    scale = 0;
  }
  if (negative) coefficient = -coefficient;

  return Object.freeze({ coefficient, scale });
}

function isMultipleOf(value: number, multiple: DecimalNumber): boolean {
  const candidate = decimalNumber(value);
  const scale = Math.max(candidate.scale, multiple.scale);
  const candidateCoefficient = candidate.coefficient *
    10n ** BigInt(scale - candidate.scale);
  const multipleCoefficient = multiple.coefficient *
    10n ** BigInt(scale - multiple.scale);
  return candidateCoefficient % multipleCoefficient === 0n;
}

function validateLengthConstraint(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
}

function validateFiniteConstraint(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite.`);
  }
}

function unicodeCodePointLength(value: string): number {
  let length = 0;
  for (const _character of value) length += 1;
  return length;
}

function describeConstraints<TConstraints extends object>(
  constraints: TConstraints,
): { readonly constraints?: TConstraints } {
  return Object.keys(constraints).length === 0 ? {} : { constraints };
}

function annotateDefinition(
  definition: SchemaDefinition,
  metadata: SchemaMetadata,
): SchemaDefinition {
  return Object.freeze({
    ...definition,
    metadata: mergeSchemaMetadata(definition.metadata, metadata),
  }) as SchemaDefinition;
}

function mergeSchemaMetadata(
  base: SchemaMetadata | undefined,
  override: SchemaMetadata,
): SchemaMetadata {
  return freezeSchemaMetadata({
    ...(base?.title === undefined ? {} : { title: base.title }),
    ...(base?.description === undefined ? {} : { description: base.description }),
    ...(base?.examples === undefined ? {} : { examples: base.examples }),
    ...override,
  });
}

function canonicalizeDefinition(definition: SchemaDefinition): SchemaDefinition {
  const common = canonicalDefinitionCommon(definition);

  switch (definition.kind) {
    case "string":
      return Object.freeze({
        kind: "string",
        ...(definition.constraints === undefined
          ? {}
          : { constraints: Object.freeze({ ...definition.constraints }) }),
        ...common,
      });
    case "number":
      return Object.freeze({
        kind: "number",
        ...(definition.constraints === undefined
          ? {}
          : { constraints: Object.freeze({ ...definition.constraints }) }),
        ...common,
      });
    case "boolean":
      return Object.freeze({ kind: "boolean", ...common });
    case "literal":
      return Object.freeze({ kind: "literal", value: definition.value, ...common });
    case "enum":
      return Object.freeze({
        kind: "enum",
        values: canonicalizeEnumValues(definition.values),
        ...common,
      });
    case "unknown":
      return Object.freeze({ kind: "unknown", ...common });
    case "never":
      return Object.freeze({ kind: "never", ...common });
    case "array":
      return Object.freeze({
        kind: "array",
        item: canonicalizeDefinition(definition.item),
        ...(definition.constraints === undefined
          ? {}
          : { constraints: Object.freeze({ ...definition.constraints }) }),
        ...common,
      });
    case "tuple":
      return Object.freeze({
        kind: "tuple",
        items: Object.freeze(definition.items.map(canonicalizeDefinition)),
        ...common,
      });
    case "union":
      return Object.freeze({
        kind: "union",
        choices: Object.freeze(definition.choices.map(canonicalizeDefinition)),
        ...common,
      });
    case "discriminatedUnion":
      return Object.freeze({
        kind: "discriminatedUnion",
        discriminator: definition.discriminator,
        choices: Object.freeze(definition.choices.map(canonicalizeDefinition)),
        ...common,
      });
    case "intersection":
      return Object.freeze({
        kind: "intersection",
        left: canonicalizeDefinition(definition.left),
        right: canonicalizeDefinition(definition.right),
        ...common,
      });
    case "object": {
      const shape: Record<string, SchemaDefinition> = {};
      for (const key of Object.keys(definition.shape).sort()) {
        shape[key] = canonicalizeDefinition(definition.shape[key]!);
      }
      return Object.freeze({
        kind: "object",
        shape: Object.freeze(shape),
        required: Object.freeze([...definition.required].sort()),
        unknownProperties: definition.unknownProperties,
        ...common,
      });
    }
    case "record":
      return Object.freeze({
        kind: "record",
        ...(definition.key === undefined
          ? {}
          : { key: Object.freeze({ ...definition.key }) }),
        value: canonicalizeDefinition(definition.value),
        ...common,
      });
    case "nullable":
      return Object.freeze({
        kind: "nullable",
        inner: canonicalizeDefinition(definition.inner),
        ...common,
      });
    case "optional":
      return Object.freeze({
        kind: "optional",
        inner: canonicalizeDefinition(definition.inner),
        ...common,
      });
    case "transform":
      return Object.freeze({
        kind: "transform",
        inner: canonicalizeDefinition(definition.inner),
        ...(definition.id === undefined ? {} : { id: definition.id }),
        ...common,
      });
    case "reference":
      return Object.freeze({ kind: "reference", id: definition.id, ...common });
    case "opaque":
      return Object.freeze({
        kind: "opaque",
        behavior: definition.behavior,
        ...(definition.id === undefined ? {} : { id: definition.id }),
        ...common,
      });
  }
}

function canonicalDefinitionCommon(
  definition: SchemaDefinition,
): Pick<SchemaDefinitionBase, "metadata" | "refinements"> {
  return {
    ...(definition.metadata === undefined
      ? {}
      : { metadata: freezeSchemaMetadata(definition.metadata) }),
    ...(definition.refinements === undefined
      ? {}
      : { refinements: Object.freeze([...definition.refinements]) }),
  };
}
