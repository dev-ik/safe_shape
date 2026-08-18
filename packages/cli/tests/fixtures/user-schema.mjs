import {
  array,
  boolean,
  discriminatedUnion,
  enum as enumSchema,
  lazy,
  intersection,
  literal,
  nullable,
  never,
  number,
  object,
  record,
  string,
  tuple,
  union,
  unknown,
} from "@safe-shape/core";

export const userSchema = object({
  id: string(),
  role: union([literal("admin"), literal("member")]),
  age: number().optional(),
});

export const userSchemaV1 = object({
  id: string(),
  role: union([literal("admin"), literal("member")]),
});

export const userSchemaBreaking = object({
  id: string(),
  role: union([literal("admin"), literal("member")]),
  organizationId: string(),
});

export const constrainedNameV1 = string({ minLength: 2, maxLength: 10 });
export const constrainedNameV2 = string({ minLength: 3, maxLength: 10 });

export let treeSchema;
treeSchema = lazy(
  () => object({
    children: array(treeSchema),
    name: string(),
  }),
  { id: "TreeNode" },
);

export const productionPrimitivesSchema = object({
  status: enumSchema(["draft", "published", 1]),
  payload: unknown(),
  impossible: never().optional(),
});

export const structuredCompositionSchema = object({
  event: discriminatedUnion("type", [
    object({ type: literal("created"), id: string() }),
    object({ type: literal("deleted"), id: string() }),
  ]),
  name: intersection(
    string({ minLength: 2 }),
    string({ maxLength: 100 }),
  ),
});

export const formattedStringsSchema = object({
  code: string({ pattern: "^[A-Z]{3}$" }),
  id: string({ format: "uuid" }),
});

export const constrainedRecordSchema = object({
  amount: number({ minimum: 0, multipleOf: 0.01 }),
  labels: record(boolean(), {
    key: { minLength: 2, pattern: "^[a-z]+$" },
  }),
});

export const objectPoliciesSchema = object({
  stripped: object({ id: string() }, { unknownProperties: "strip" }),
  open: object({ id: string() }, { unknownProperties: "passthrough" }),
});

export const refinedSchema = object({
  name: string().refine((value) => value.length > 0, {
    id: "non-empty/v1",
    message: "Expected a non-empty name.",
  }),
});

export const addressableDiagnosticsSchema = object({
  start: number(),
  end: number(),
}).refineWithIssues((value, context) => {
  if (value.start > value.end) {
    context.addIssue({ path: ["start"], message: "Start must not exceed end." });
    context.addIssue({ path: ["end"], message: "End must not precede start." });
  }
}, { id: "ordered-period/v1" });

export const annotatedUserSchema = object({
  id: string().annotate({
    title: "User id",
    description: "Stable public user identifier.",
    examples: ["user_1"],
  }),
  role: union([literal("admin"), literal("member")]),
}).annotate({
  title: "User",
  description: "User resource.",
});

export const profileSchema = object({
  id: string(),
  tags: array(string()),
  coordinates: tuple([number(), number()]),
  flags: record(boolean()),
  bio: nullable(string()).optional(),
  score: number().transform((value) => value.toString()),
});

export default userSchema;
