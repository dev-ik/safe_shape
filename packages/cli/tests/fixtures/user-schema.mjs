import {
  array,
  boolean,
  literal,
  nullable,
  number,
  object,
  record,
  string,
  tuple,
  union,
} from "@safe-shape/core";

export const userSchema = object({
  id: string(),
  role: union([literal("admin"), literal("member")]),
  age: number().optional(),
});

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
