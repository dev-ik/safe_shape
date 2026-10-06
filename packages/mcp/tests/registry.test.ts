import assert from "node:assert/strict";
import test from "node:test";
import { object, string } from "@safe-shape/core";
import * as api from "../src/index.js";

test("registry validates, copies and freezes entries without executing rules", () => {
  const create = (api as any).createMcpContractRegistry;
  assert.equal(typeof create, "function");
  let calls = 0;
  const schema = object({ id: string() }).refine(() => { calls++; return true; }, { id: "rule" });
  const entry = { id: "__proto__", description: "User", schema };
  const registry = create([entry, { ...entry, id: "constructor" }]);
  entry.description = "changed";
  assert.equal(registry.getContract("__proto__").description, "User");
  assert.equal(registry.getContract("constructor").schema, schema);
  assert.equal(calls, 0);
  assert.ok(Object.isFrozen(registry));
  assert.ok(Object.isFrozen(registry.contracts));
  assert.ok(Object.isFrozen(registry.contracts[0]));
  for (const id of ["", " ", "x".repeat(129)]) assert.throws(() => create([{ ...entry, id }]), TypeError);
  assert.throws(() => create([entry, entry]), TypeError);
  assert.throws(() => create([entry], [{ id: "t", name: "t", description: "tool", inputId: "missing", outputId: "__proto__" }]), TypeError);
});
