import assert from "node:assert/strict";
import test from "node:test";
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
import { toTypeScriptType } from "../src/index.js";

test("generates primitive literal array tuple union record and nullable types", () => {
  assert.equal(toTypeScriptType(string()), "export type SchemaOutput = string;\n");
  assert.equal(toTypeScriptType(number(), { name: "Amount" }), "export type Amount = number;\n");
  assert.equal(toTypeScriptType(boolean()), "export type SchemaOutput = boolean;\n");
  assert.equal(toTypeScriptType(literal("ok")), "export type SchemaOutput = \"ok\";\n");
  assert.equal(toTypeScriptType(array(string())), "export type SchemaOutput = ReadonlyArray<string>;\n");
  assert.equal(toTypeScriptType(tuple([string(), number()])), "export type SchemaOutput = readonly [string, number];\n");
  assert.equal(toTypeScriptType(union([literal("admin"), literal("member")])), "export type SchemaOutput = \"admin\" | \"member\";\n");
  assert.equal(toTypeScriptType(record(nullable(string()))), "export type SchemaOutput = Readonly<Record<string, string | null>>;\n");
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
