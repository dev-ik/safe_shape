import assert from "node:assert/strict";
import test from "node:test";
import {
  httpContract,
  object,
  safeParseHttpRequest,
  string,
  toJsonSchema,
  toTypeScriptType,
  validateSchema,
} from "../src/index.js";

test("umbrella package exposes runtime and tooling helpers", () => {
  const userSchema = object({
    id: string().annotate({ title: "User id" }),
  }).annotate({ title: "User" });

  assert.deepEqual(userSchema.parse({ id: "user_1" }), { id: "user_1" });
  assert.deepEqual(validateSchema(userSchema, { id: "user_1" }), {
    valid: true,
    data: { id: "user_1" },
  });
  assert.equal(toJsonSchema(userSchema).title, "User");
  assert.equal(toTypeScriptType(userSchema, { name: "User" }), `export type User = {
  id: string;
};
`);

  const contract = httpContract({
    params: object({ id: string() }),
  });
  const request = safeParseHttpRequest(contract, { params: { id: "user_1" } });

  assert.equal(request.success, true);
});
