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
import { toJsonSchema } from "../src/index.js";

test("exports primitive schemas", () => {
  assert.deepEqual(toJsonSchema(string()), { type: "string" });
  assert.deepEqual(toJsonSchema(number()), { type: "number" });
  assert.deepEqual(toJsonSchema(boolean()), { type: "boolean" });
  assert.deepEqual(toJsonSchema(literal("ok")), { const: "ok" });
});

test("exports arrays tuples unions records and nullable schemas", () => {
  assert.deepEqual(toJsonSchema(array(string())), {
    type: "array",
    items: { type: "string" },
  });
  assert.deepEqual(toJsonSchema(tuple([string(), number()])), {
    type: "array",
    prefixItems: [{ type: "string" }, { type: "number" }],
    minItems: 2,
    maxItems: 2,
  });
  assert.deepEqual(toJsonSchema(union([string(), number()])), {
    anyOf: [{ type: "string" }, { type: "number" }],
  });
  assert.deepEqual(toJsonSchema(record(nullable(string()))), {
    type: "object",
    additionalProperties: {
      anyOf: [{ type: "string" }, { type: "null" }],
    },
  });
});

test("exports strict object schemas with required properties", () => {
  const userSchema = object({
    id: string(),
    age: number().optional(),
    role: union([literal("admin"), literal("member")]),
  });

  assert.deepEqual(toJsonSchema(userSchema), {
    type: "object",
    properties: {
      id: { type: "string" },
      age: { type: "number" },
      role: {
        anyOf: [{ const: "admin" }, { const: "member" }],
      },
    },
    required: ["id", "role"],
    additionalProperties: false,
  });
});

test("exports schema metadata as JSON Schema annotations", () => {
  const userSchema = object({
    id: string().annotate({
      title: "User id",
      description: "Stable public user identifier.",
      examples: ["user_1"],
    }),
    nickname: string().optional().annotate({
      description: "Optional display nickname.",
    }),
  }).annotate({
    title: "User",
    description: "User resource.",
  });

  assert.deepEqual(toJsonSchema(userSchema), {
    type: "object",
    title: "User",
    description: "User resource.",
    properties: {
      id: {
        type: "string",
        title: "User id",
        description: "Stable public user identifier.",
        examples: ["user_1"],
      },
      nickname: {
        type: "string",
        description: "Optional display nickname.",
      },
    },
    required: ["id"],
    additionalProperties: false,
  });
});

test("exports transform schemas as their input schema", () => {
  assert.deepEqual(toJsonSchema(string().transform((value) => value.length)), {
    type: "string",
  });
});

test("adds a JSON Schema dialect when requested", () => {
  assert.deepEqual(toJsonSchema(string(), { schema: "https://json-schema.org/draft/2020-12/schema" }), {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "string",
  });
});
