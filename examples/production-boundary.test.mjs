import assert from "node:assert/strict";
import test from "node:test";
import { createUserHandler } from "./production-boundary.mjs";
import { readUserResponse } from "./resilient-http-response.mjs";

test("invalid operations are logged, rejected and followed by successful requests", async () => {
  const events = [], saved = [];
  const handle = createUserHandler({
    saveUser: async (data) => { saved.push(data); return { id: "user-1", ...data }; },
    report: (event) => events.push(event),
  });
  assert.deepEqual(await handle({ name: 42, "private-extra": "secret" }), { status: 400, body: { code: "invalid_request" } });
  assert.equal(saved.length, 0);
  assert.deepEqual(events[0].diagnostics.map((issue) => issue.path), [["name"], ["<unknown>"]]);
  assert.equal(JSON.stringify(events).includes("private-extra"), false);
  assert.equal(JSON.stringify(events).includes("secret"), false);
  assert.deepEqual(await handle({ name: "Ada" }), { status: 201, body: { id: "user-1", name: "Ada" } });
  assert.equal(saved.length, 1);
  assert.equal(events.length, 1);
});

test("callback, unexpected input and invalid response failures stay local to an operation", async () => {
  const events = [];
  const handle = createUserHandler({
    report: (event) => events.push(event),
    saveUser: async (data) => {
      if (data.name === "fail") throw new Error("private database failure");
      return { id: data.name === "drift" ? 1 : "user-1", name: data.name };
    },
  });
  assert.equal((await handle({ name: "fail" })).status, 503);
  assert.deepEqual(await handle({ name: "drift" }), { status: 503, body: { code: "response_unavailable" } });
  const accessor = { get name() { throw new Error("private getter"); } };
  assert.equal((await handle(accessor)).status, 503);
  assert.deepEqual(events.map((event) => event.boundary), ["operation", "response", "request"]);
  assert.equal(JSON.stringify(events).includes("private"), false);
  assert.equal((await handle({ name: "Ada" })).status, 201);
});

test("throwing, rejecting and pending telemetry cannot fail or stall production requests", async () => {
  for (const report of [
    () => { throw new Error("logger unavailable"); },
    async () => { throw new Error("logger unavailable"); },
    () => new Promise(() => {}),
  ]) {
    const handle = createUserHandler({ saveUser: (data) => ({ id: "user-1", ...data }), report });
    assert.equal((await handle({})).status, 400);
    assert.equal((await handle({ name: "Ada" })).status, 201);
    const recovered = readUserResponse({ id: 42 }, 200, {
      fallback: () => ({ id: "cached", name: "Ada" }), report,
    });
    assert.equal(recovered.kind, "recovered");
  }
  const unavailable = readUserResponse({}, 200, {
    fallback: async () => { throw new Error("cache unavailable"); },
    report: async () => { throw new Error("logger unavailable"); },
  });
  assert.equal(unavailable.kind, "unavailable");
  // Node's test runner fails this test/process on unhandled rejections.
  await new Promise((resolve) => setImmediate(resolve));
});
