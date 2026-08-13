import { describeLiteral, type Issue } from "./issue.js";
import { createParseContext, type ParseContext } from "./parser.js";
import { failure, success, type ParseResult } from "./result.js";

const parseSymbol: unique symbol = Symbol("safeShape.parse");
const optionalSymbol: unique symbol = Symbol("safeShape.optional");
const describeSymbol: unique symbol = Symbol("safeShape.describe");

export interface Schema<T> {
  readonly kind: string;
  parse(input: unknown): T;
  safeParse(input: unknown): ParseResult<T>;
  annotate(metadata: SchemaMetadata): Schema<T>;
  refine(predicate: Refinement<T>, options?: RefinementOptions): Schema<T>;
  transform<TOutput>(mapper: Transform<T, TOutput>, options?: TransformOptions): Schema<TOutput>;
  nullable(): Schema<T | null>;
  optional(): Schema<T | undefined>;
}

export type Infer<TSchema extends Schema<any>> =
  TSchema extends Schema<infer Output> ? Output : never;

export interface RefinementOptions {
  readonly message?: string;
  readonly expected?: string;
  readonly suggestion?: string;
}

export type Refinement<T> = (value: T) => boolean;

export interface TransformOptions {
  readonly message?: string;
  readonly expected?: string;
  readonly suggestion?: string;
}

export type Transform<TInput, TOutput> = (value: TInput) => TOutput;

export type Shape = Record<string, Schema<any>>;

type OptionalKeys<TShape extends Shape> = {
  [Key in keyof TShape]: undefined extends Infer<TShape[Key]> ? Key : never;
}[keyof TShape];

type RequiredKeys<TShape extends Shape> = Exclude<keyof TShape, OptionalKeys<TShape>>;

type Expand<T> = {
  [Key in keyof T]: T[Key];
} & {};

export type ObjectOutput<TShape extends Shape> = Expand<{
  [Key in RequiredKeys<TShape>]: Infer<TShape[Key]>;
} & {
  [Key in OptionalKeys<TShape>]?: Exclude<Infer<TShape[Key]>, undefined>;
}>;

export type RecordOutput<TValueSchema extends Schema<any>> = Readonly<
  Record<string, Infer<TValueSchema>>
>;

export type TupleOutput<TItems extends readonly Schema<any>[]> = Readonly<{
  [Index in keyof TItems]: TItems[Index] extends Schema<any> ? Infer<TItems[Index]> : never;
}>;

export type LiteralValue = string | number | boolean | null | undefined;

export interface SchemaMetadata {
  readonly title?: string;
  readonly description?: string;
  readonly examples?: readonly unknown[];
}

type SchemaDefinitionBase = {
  readonly metadata?: SchemaMetadata;
};

export type SchemaDefinition =
  | (SchemaDefinitionBase & { readonly kind: "string" })
  | (SchemaDefinitionBase & { readonly kind: "number" })
  | (SchemaDefinitionBase & { readonly kind: "boolean" })
  | (SchemaDefinitionBase & { readonly kind: "literal"; readonly value: LiteralValue })
  | (SchemaDefinitionBase & { readonly kind: "array"; readonly item: SchemaDefinition })
  | (SchemaDefinitionBase & { readonly kind: "tuple"; readonly items: readonly SchemaDefinition[] })
  | (SchemaDefinitionBase & { readonly kind: "union"; readonly choices: readonly SchemaDefinition[] })
  | {
      readonly kind: "object";
      readonly shape: Readonly<Record<string, SchemaDefinition>>;
      readonly required: readonly string[];
      readonly metadata?: SchemaMetadata;
    }
  | (SchemaDefinitionBase & { readonly kind: "record"; readonly value: SchemaDefinition })
  | (SchemaDefinitionBase & { readonly kind: "nullable"; readonly inner: SchemaDefinition })
  | (SchemaDefinitionBase & { readonly kind: "optional"; readonly inner: SchemaDefinition })
  | (SchemaDefinitionBase & { readonly kind: "transform"; readonly inner: SchemaDefinition });

interface InternalSchema<T> extends Schema<T> {
  readonly [optionalSymbol]?: true;
  [parseSymbol](input: unknown, context: ParseContext): ParseResult<T>;
  [describeSymbol](): SchemaDefinition;
}

interface Check<T> {
  readonly predicate: Refinement<T>;
  readonly options: RefinementOptions;
}

abstract class BaseSchema<T> implements InternalSchema<T> {
  abstract readonly kind: string;
  private readonly checks: readonly Check<T>[];

  protected constructor(checks: readonly Check<T>[] = []) {
    this.checks = Object.freeze(checks.map(cloneCheck));
  }

  parse(input: unknown): T {
    const result = this.safeParse(input);

    if (!result.success) {
      throw result.error;
    }

    return result.data;
  }

  safeParse(input: unknown): ParseResult<T> {
    return this[parseSymbol](input, createParseContext());
  }

  annotate(metadata: SchemaMetadata): Schema<T> {
    return new AnnotatedSchema(this, metadata);
  }

  refine(predicate: Refinement<T>, options: RefinementOptions = {}): Schema<T> {
    return this.cloneWithChecks([...this.checks, createCheck(predicate, options)]);
  }

  transform<TOutput>(
    mapper: Transform<T, TOutput>,
    options: TransformOptions = {},
  ): Schema<TOutput> {
    return new TransformSchema(this, mapper, options);
  }

  nullable(): Schema<T | null> {
    return new NullableSchema(this);
  }

  optional(): Schema<T | undefined> {
    return new OptionalSchema(this);
  }

  [parseSymbol](input: unknown, context: ParseContext): ParseResult<T> {
    const parsed = this.parseBase(input, context);

    if (!parsed.success) {
      return parsed;
    }

    return this.applyChecks(parsed.data, input, context);
  }

  protected abstract parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<T>;

  protected abstract cloneWithChecks(checks: readonly Check<T>[]): BaseSchema<T>;

  abstract [describeSymbol](): SchemaDefinition;

  private applyChecks(
    data: T,
    originalInput: unknown,
    context: ParseContext,
  ): ParseResult<T> {
    const issues: Issue[] = [];

    for (const check of this.checks) {
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
            expected: check.options.expected ?? "value satisfying refinement",
            received: originalInput,
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

  constructor(checks: readonly Check<string>[] = []) {
    super(checks);
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<string> {
    if (typeof input === "string") {
      return success(input);
    }

    return failure([
      context.issue({
        code: "invalid_type",
        expected: "string",
        received: input,
        message: "Expected a string.",
        suggestion: "Pass a string value.",
      }),
    ]);
  }

  protected cloneWithChecks(checks: readonly Check<string>[]): BaseSchema<string> {
    return new StringSchema(checks);
  }

  [describeSymbol](): SchemaDefinition {
    return Object.freeze({ kind: "string" });
  }
}

class NumberSchema extends BaseSchema<number> {
  readonly kind = "number";

  constructor(checks: readonly Check<number>[] = []) {
    super(checks);
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<number> {
    if (typeof input === "number" && Number.isFinite(input)) {
      return success(input);
    }

    return failure([
      context.issue({
        code: "invalid_type",
        expected: "finite number",
        received: input,
        message: "Expected a finite number.",
        suggestion: "Pass a number value without coercion.",
      }),
    ]);
  }

  protected cloneWithChecks(checks: readonly Check<number>[]): BaseSchema<number> {
    return new NumberSchema(checks);
  }

  [describeSymbol](): SchemaDefinition {
    return Object.freeze({ kind: "number" });
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
    return Object.freeze({ kind: "boolean" });
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
    return Object.freeze({ kind: "literal", value: this.value });
  }
}

class ArraySchema<TItem> extends BaseSchema<readonly TItem[]> {
  readonly kind = "array";

  constructor(
    private readonly itemSchema: InternalSchema<TItem>,
    checks: readonly Check<readonly TItem[]>[] = [],
  ) {
    super(checks);
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<readonly TItem[]> {
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

    const output: TItem[] = [];
    const issues: Issue[] = [];

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

  protected cloneWithChecks(checks: readonly Check<readonly TItem[]>[]): BaseSchema<readonly TItem[]> {
    return new ArraySchema(this.itemSchema, checks);
  }

  [describeSymbol](): SchemaDefinition {
    return Object.freeze({
      kind: "array",
      item: this.itemSchema[describeSymbol](),
    });
  }
}

class TupleSchema<TItems extends readonly Schema<any>[]>
  extends BaseSchema<TupleOutput<TItems>>
{
  readonly kind = "tuple";
  private readonly sourceItems: TItems;
  private readonly items: readonly InternalSchema<unknown>[];

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
  ): BaseSchema<TupleOutput<TItems>> {
    return new TupleSchema(this.sourceItems, checks);
  }

  [describeSymbol](): SchemaDefinition {
    return Object.freeze({
      kind: "tuple",
      items: Object.freeze(this.items.map((item) => item[describeSymbol]())),
    });
  }
}

class UnionSchema<TSchemas extends readonly [Schema<any>, ...Schema<any>[]]>
  extends BaseSchema<Infer<TSchemas[number]>>
{
  readonly kind = "union";
  private readonly sourceChoices: TSchemas;
  private readonly choices: readonly InternalSchema<Infer<TSchemas[number]>>[];

  constructor(
    choices: TSchemas,
    checks: readonly Check<Infer<TSchemas[number]>>[] = [],
  ) {
    super(checks);
    this.sourceChoices = Object.freeze([...choices]) as unknown as TSchemas;
    this.choices = Object.freeze(
      this.sourceChoices.map((choice) => toInternalSchema(choice)) as InternalSchema<Infer<TSchemas[number]>>[],
    );
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<Infer<TSchemas[number]>> {
    for (const choice of this.choices) {
      const result = choice[parseSymbol](input, context);

      if (result.success) {
        return result;
      }
    }

    return failure([
      context.issue({
        code: "invalid_union",
        expected: describeUnionExpected(this.choices),
        received: input,
        message: "Expected input to match one union choice.",
        suggestion: "Pass a value that satisfies one of the union schemas.",
      }),
    ]);
  }

  protected cloneWithChecks(
    checks: readonly Check<Infer<TSchemas[number]>>[],
  ): BaseSchema<Infer<TSchemas[number]>> {
    return new UnionSchema(this.sourceChoices, checks);
  }

  [describeSymbol](): SchemaDefinition {
    return Object.freeze({
      kind: "union",
      choices: Object.freeze(this.choices.map((choice) => choice[describeSymbol]())),
    });
  }
}

class ObjectSchema<TShape extends Shape> extends BaseSchema<ObjectOutput<TShape>> {
  readonly kind = "object";
  private readonly shape: Readonly<TShape>;

  constructor(shape: TShape, checks: readonly Check<ObjectOutput<TShape>>[] = []) {
    super(checks);
    this.shape = Object.freeze({ ...shape });
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<ObjectOutput<TShape>> {
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
          output[key] = result.data;
        }
      } else {
        issues.push(...result.error.issues);
      }

      inputKeys.delete(key);
    }

    for (const key of inputKeys) {
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
      ? success(Object.freeze(output) as ObjectOutput<TShape>)
      : failure(issues);
  }

  protected cloneWithChecks(
    checks: readonly Check<ObjectOutput<TShape>>[],
  ): BaseSchema<ObjectOutput<TShape>> {
    return new ObjectSchema(this.shape, checks);
  }

  [describeSymbol](): SchemaDefinition {
    const shape: Record<string, SchemaDefinition> = {};
    const required: string[] = [];

    for (const [key, schema] of Object.entries(this.shape)) {
      const childSchema = toInternalSchema(schema);
      shape[key] = childSchema[describeSymbol]();

      if (!isOptionalSchema(childSchema)) {
        required.push(key);
      }
    }

    return Object.freeze({
      kind: "object",
      shape: Object.freeze(shape),
      required: Object.freeze(required),
    });
  }
}

class RecordSchema<TValue> extends BaseSchema<Readonly<Record<string, TValue>>> {
  readonly kind = "record";

  constructor(
    private readonly valueSchema: InternalSchema<TValue>,
    checks: readonly Check<Readonly<Record<string, TValue>>>[] = [],
  ) {
    super(checks);
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<Readonly<Record<string, TValue>>> {
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

    const output: Record<string, TValue> = {};
    const issues: Issue[] = [];

    for (const [key, value] of Object.entries(input)) {
      const result = this.valueSchema[parseSymbol](value, context.child(key));

      if (result.success) {
        output[key] = result.data;
      } else {
        issues.push(...result.error.issues);
      }
    }

    return issues.length === 0
      ? success(Object.freeze(output))
      : failure(issues);
  }

  protected cloneWithChecks(
    checks: readonly Check<Readonly<Record<string, TValue>>>[],
  ): BaseSchema<Readonly<Record<string, TValue>>> {
    return new RecordSchema(this.valueSchema, checks);
  }

  [describeSymbol](): SchemaDefinition {
    return Object.freeze({
      kind: "record",
      value: this.valueSchema[describeSymbol](),
    });
  }
}

class NullableSchema<T> extends BaseSchema<T | null> {
  readonly kind = "nullable";

  constructor(
    private readonly innerSchema: InternalSchema<T>,
    checks: readonly Check<T | null>[] = [],
  ) {
    super(checks);
    Object.freeze(this);
  }

  protected parseBase(input: unknown, context: ParseContext): ParseResult<T | null> {
    if (input === null) {
      return success(null);
    }

    return this.innerSchema[parseSymbol](input, context);
  }

  protected cloneWithChecks(checks: readonly Check<T | null>[]): BaseSchema<T | null> {
    return new NullableSchema(this.innerSchema, checks);
  }

  [describeSymbol](): SchemaDefinition {
    return Object.freeze({
      kind: "nullable",
      inner: this.innerSchema[describeSymbol](),
    });
  }
}

class OptionalSchema<T> extends BaseSchema<T | undefined> {
  readonly kind = "optional";
  readonly [optionalSymbol] = true;

  constructor(
    private readonly innerSchema: InternalSchema<T>,
    checks: readonly Check<T | undefined>[] = [],
  ) {
    super(checks);
    Object.freeze(this);
  }

  protected parseBase(
    input: unknown,
    context: ParseContext,
  ): ParseResult<T | undefined> {
    if (input === undefined) {
      return success(undefined);
    }

    return this.innerSchema[parseSymbol](input, context);
  }

  protected cloneWithChecks(checks: readonly Check<T | undefined>[]): BaseSchema<T | undefined> {
    return new OptionalSchema(this.innerSchema, checks);
  }

  [describeSymbol](): SchemaDefinition {
    return Object.freeze({
      kind: "optional",
      inner: this.innerSchema[describeSymbol](),
    });
  }
}

class TransformSchema<TInput, TOutput> extends BaseSchema<TOutput> {
  readonly kind = "transform";

  constructor(
    private readonly innerSchema: InternalSchema<TInput>,
    private readonly mapper: Transform<TInput, TOutput>,
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

  protected cloneWithChecks(checks: readonly Check<TOutput>[]): BaseSchema<TOutput> {
    return new TransformSchema(this.innerSchema, this.mapper, this.options, checks);
  }

  [describeSymbol](): SchemaDefinition {
    return Object.freeze({
      kind: "transform",
      inner: this.innerSchema[describeSymbol](),
    });
  }
}

class AnnotatedSchema<T> extends BaseSchema<T> {
  readonly kind: string;
  readonly [optionalSymbol]?: true;
  private readonly metadata: SchemaMetadata;

  constructor(
    private readonly innerSchema: InternalSchema<T>,
    metadata: SchemaMetadata,
    checks: readonly Check<T>[] = [],
  ) {
    super(checks);
    this.kind = innerSchema.kind;
    if (isOptionalSchema(innerSchema)) {
      this[optionalSymbol] = true;
    }
    this.metadata = freezeSchemaMetadata(metadata);
    Object.freeze(this);
  }

  protected parseBase(input: unknown, context: ParseContext): ParseResult<T> {
    return this.innerSchema[parseSymbol](input, context);
  }

  protected cloneWithChecks(checks: readonly Check<T>[]): BaseSchema<T> {
    return new AnnotatedSchema(this.innerSchema, this.metadata, checks);
  }

  [describeSymbol](): SchemaDefinition {
    return annotateDefinition(this.innerSchema[describeSymbol](), this.metadata);
  }
}

export function string(): Schema<string> {
  return new StringSchema();
}

export function number(): Schema<number> {
  return new NumberSchema();
}

export function boolean(): Schema<boolean> {
  return new BooleanSchema();
}

export function literal<T extends LiteralValue>(
  value: T,
): Schema<T> {
  return new LiteralSchema(value);
}

export function array<TSchema extends Schema<any>>(
  itemSchema: TSchema,
): Schema<readonly Infer<TSchema>[]> {
  return new ArraySchema<Infer<TSchema>>(toInternalSchema(itemSchema));
}

export function tuple<const TItems extends readonly Schema<any>[]>(
  items: TItems,
): Schema<TupleOutput<TItems>> {
  return new TupleSchema(items);
}

export function union<const TSchemas extends readonly [Schema<any>, ...Schema<any>[]]>(
  choices: TSchemas,
): Schema<Infer<TSchemas[number]>> {
  return new UnionSchema(choices);
}

export function object<TShape extends Shape>(shape: TShape): Schema<ObjectOutput<TShape>> {
  return new ObjectSchema(shape);
}

export function record<TValueSchema extends Schema<any>>(
  valueSchema: TValueSchema,
): Schema<RecordOutput<TValueSchema>> {
  return new RecordSchema<Infer<TValueSchema>>(toInternalSchema(valueSchema));
}

export function nullable<TSchema extends Schema<any>>(
  schema: TSchema,
): Schema<Infer<TSchema> | null> {
  return schema.nullable() as Schema<Infer<TSchema> | null>;
}

export function optional<TSchema extends Schema<any>>(
  schema: TSchema,
): Schema<Infer<TSchema> | undefined> {
  return schema.optional() as Schema<Infer<TSchema> | undefined>;
}

export function annotate<TSchema extends Schema<any>>(
  schema: TSchema,
  metadata: SchemaMetadata,
): Schema<Infer<TSchema>> {
  return schema.annotate(metadata) as Schema<Infer<TSchema>>;
}

export function describeSchema(schema: Schema<any>): SchemaDefinition {
  return toInternalSchema(schema)[describeSymbol]();
}

export const schema = Object.freeze({
  string,
  number,
  boolean,
  literal,
  array,
  tuple,
  union,
  object,
  record,
  nullable,
  optional,
  annotate,
});

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function toInternalSchema<T>(schemaValue: Schema<T>): InternalSchema<T> {
  return schemaValue as InternalSchema<T>;
}

function isOptionalSchema(schemaValue: InternalSchema<unknown>): boolean {
  return schemaValue[optionalSymbol] === true;
}

function describeUnionExpected(choices: readonly Schema<unknown>[]): string {
  return choices.map((choice) => choice.kind).join(" | ");
}

function createCheck<T>(predicate: Refinement<T>, options: RefinementOptions): Check<T> {
  return Object.freeze({
    predicate,
    options: freezeRefinementOptions(options),
  });
}

function cloneCheck<T>(check: Check<T>): Check<T> {
  return createCheck(check.predicate, check.options);
}

function freezeRefinementOptions(options: RefinementOptions): RefinementOptions {
  return Object.freeze({
    ...(options.message === undefined ? {} : { message: options.message }),
    ...(options.expected === undefined ? {} : { expected: options.expected }),
    ...(options.suggestion === undefined ? {} : { suggestion: options.suggestion }),
  });
}

function freezeTransformOptions(options: TransformOptions): TransformOptions {
  return Object.freeze({
    ...(options.message === undefined ? {} : { message: options.message }),
    ...(options.expected === undefined ? {} : { expected: options.expected }),
    ...(options.suggestion === undefined ? {} : { suggestion: options.suggestion }),
  });
}

function freezeSchemaMetadata(metadata: SchemaMetadata): SchemaMetadata {
  return Object.freeze({
    ...(metadata.title === undefined ? {} : { title: metadata.title }),
    ...(metadata.description === undefined ? {} : { description: metadata.description }),
    ...(metadata.examples === undefined ? {} : { examples: Object.freeze([...metadata.examples]) }),
  });
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
