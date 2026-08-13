import { literal, number, object, string, union } from "@safe-shape/core";

export const userSchema = object({
  id: string().annotate({
    title: "User id",
    description: "Stable public user identifier.",
    examples: ["user_1"],
  }),
  role: union([literal("admin"), literal("member")]),
  age: number().optional(),
}).annotate({
  title: "User",
  description: "User resource.",
});

export default userSchema;
