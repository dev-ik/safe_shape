import assert from "node:assert/strict";
import test from "node:test";
import {
  array,
  boolean,
  discriminatedUnion,
  enum as enumSchema,
  literal,
  lazy,
  intersection,
  nullable,
  never as neverSchema,
  number,
  object,
  record,
  string,
  tuple,
  union,
  unknown as unknownSchema,
  type Schema,
} from "@safe-shape/core";
import { toTypeScriptType } from "../src/index.js";

test("generates primitive literal array tuple union record and nullable types", () => {
  assert.equal(toTypeScriptType(string()), "export type SchemaOutput = string;\n");
  assert.equal(
    toTypeScriptType(string({ pattern: "^[a-z]+$", format: "email" })),
    "export type SchemaOutput = string;\n",
  );
  assert.equal(
    toTypeScriptType(number({ multipleOf: 0.01 }), { name: "Amount" }),
    "export type Amount = number;\n",
  );
  assert.equal(toTypeScriptType(boolean()), "export type SchemaOutput = boolean;\n");
  assert.equal(toTypeScriptType(literal("ok")), "export type SchemaOutput = \"ok\";\n");
  assert.equal(toTypeScriptType(enumSchema(["draft", "published", 1])), "export type SchemaOutput = \"draft\" | \"published\" | 1;\n");
  assert.equal(toTypeScriptType(unknownSchema()), "export type SchemaOutput = unknown;\n");
  assert.equal(toTypeScriptType(neverSchema()), "export type SchemaOutput = never;\n");
  assert.equal(toTypeScriptType(array(string())), "export type SchemaOutput = ReadonlyArray<string>;\n");
  assert.equal(toTypeScriptType(tuple([string(), number()])), "export type SchemaOutput = readonly [string, number];\n");
  assert.equal(toTypeScriptType(union([literal("admin"), literal("member")])), "export type SchemaOutput = \"admin\" | \"member\";\n");
  assert.equal(
    toTypeScriptType(record(nullable(string()), { key: { pattern: "^[a-z]+$" } })),
    "export type SchemaOutput = Readonly<Record<string, string | null>>;\n",
  );
});

test("generates object types with required and optional properties", () => {
  const userSchema = object({
    id: string(),
    "display-name": string().optional(),
    role: union([literal("admin"), literal("member")]),
    age: number().optional(),
  });

  assert.equal(toTypeScriptType(userSchema, { name: "User" }), `export type User = {
  id: string;
  "display-name"?: string;
  role: "admin" | "member";
  age?: number;
};
`);
});

test("generates an unknown index for passthrough object output only", () => {
  assert.equal(toTypeScriptType(object(
    { id: string() },
    { unknownProperties: "passthrough" },
  ), { name: "OpenObject" }), `export type OpenObject = {
  id: string;
  readonly [key: string]: unknown;
};
`);
  assert.equal(toTypeScriptType(object(
    { id: string() },
    { unknownProperties: "strip" },
  ), { name: "StrippedObject" }), `export type StrippedObject = {
  id: string;
};
`);
});

test("generates discriminated union and intersection types", () => {
  const eventSchema = discriminatedUnion("type", [
    object({ type: literal("created"), id: string() }),
    object({ type: literal("deleted"), id: string() }),
  ] as const);

  assert.equal(toTypeScriptType(eventSchema, { name: "Event" }), `export type Event = {
  type: "created";
  id: string;
} | {
  type: "deleted";
  id: string;
};
`);
  assert.equal(
    toTypeScriptType(intersection(string(), literal("ready")), { name: "Ready" }),
    'export type Ready = (string) & ("ready");\n',
  );
});

test("generates types through annotated nullable and optional schemas", () => {
  const userSchema = object({
    id: string().annotate({
      title: "User id",
      description: "Stable public user identifier.",
      examples: ["user_1"],
    }),
    name: nullable(string().annotate({ title: "Display name" })).optional(),
    role: union([literal("admin"), literal("member")]).annotate({
      description: "Role assigned to the user.",
    }),
  }).annotate({
    title: "User",
    description: "User resource.",
  });

  assert.equal(toTypeScriptType(userSchema, { name: "User" }), `export type User = {
  id: string;
  name?: string | null;
  role: "admin" | "member";
};
`);
});

test("generates unknown for transform output types", () => {
  assert.equal(toTypeScriptType(string().transform((value) => value.length)), "export type SchemaOutput = unknown;\n");
});

test("rejects invalid TypeScript type names", () => {
  assert.throws(
    () => toTypeScriptType(string(), { name: "not-valid" }),
    /Invalid TypeScript type name/,
  );
});

test("rejects recursive references until graph type generation is implemented", () => {
  interface TreeNode {
    readonly children: readonly TreeNode[];
  }

  let treeSchema: Schema<TreeNode>;
  treeSchema = lazy(
    () => object({ children: array(treeSchema) }),
    { id: "TreeNode" },
  );

  assert.throws(
    () => toTypeScriptType(treeSchema),
    /does not support schema references yet/,
  );
});
