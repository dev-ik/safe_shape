import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { array, checkContractConnection, createContractSnapshotV2, enumeration, httpContract, lazy, number, object, string, toTypeScriptType } from "safe-shape";

const User = object({ id: string({ minLength: 1 }), name: string({ minLength: 1 }) });
const CreateUser = User.omit(["id"]);
const UpdateUser = CreateUser.partial();
const Request = httpContract({
  query: object({ limit: string({ pattern: "^[0-9]+$" }).transform(Number).pipe(number({ integer: true, minimum: 1, maximum: 100 })) }),
  body: CreateUser,
  response: User,
});
assert.deepEqual(Request.parseRequest({ query: { limit: "10" }, body: { name: "Ada" } }), { query: { limit: 10 }, body: { name: "Ada" } });
assert.equal(Request.safeParseRequest({ query: { limit: "invalid" }, body: {} }).success, false);
assert.deepEqual(UpdateUser.parse({}), {});
assert.deepEqual(Request.parseResponse({ id: "user_1", name: "Ada" }), { id: "user_1", name: "Ada" });
assert.equal(Request.safeParseResponse({ id: 1, name: "Ada" }).success, false);

let Tree;
Tree = lazy(() => object({ user: User, children: array(Tree) }), { id: "UserTree" });
assert.match(toTypeScriptType(Tree, { name: "Tree" }), /ReadonlyArray<UserTree>/);

const oldClient = createContractSnapshotV2(object({ state: enumeration(["active", "disabled"]) }), { id: "web@1" });
const newServer = createContractSnapshotV2(object({ state: enumeration(["active", "disabled", "paused"]) }), { id: "api@2" });
const updatedClient = createContractSnapshotV2(object({ state: enumeration(["active", "disabled", "paused"]) }), { id: "web@2" });
const breaking = checkContractConnection(newServer, oldClient);
assert.equal(breaking.migration.decision, "migration-required");
assert.deepEqual(breaking.counterexample.value, { state: "paused" });
assert.equal(checkContractConnection(newServer, updatedClient).compatible, true);

const directory = await mkdtemp(join(tmpdir(), "safe-shape-connections-"));
try {
  for (const [name, snapshot] of [["server", newServer], ["old-client", oldClient], ["new-client", updatedClient]]) await writeFile(join(directory, `${name}.json`), JSON.stringify(snapshot));
  const original = await readFile(join(directory, "old-client.json"), "utf8");
  const manifest = join(directory, "connections.json");
  await writeFile(manifest, JSON.stringify({ version: 1, connections: [
    { name: "api-to-old-web", producer: "server.json", consumer: "old-client.json" },
    { name: "api-to-new-web", producer: "server.json", consumer: "new-client.json" },
  ] }));
  const cli = resolve(process.argv[2] ?? "node_modules/@safe-shape/cli/dist/cli.js");
  const checked = spawnSync(process.execPath, [cli, "--json", "contract", "check-connections", "--manifest", manifest], { encoding: "utf8" });
  assert.equal(checked.status, 2, checked.stderr);
  assert.deepEqual(JSON.parse(checked.stdout).results.map((entry) => entry.report.migration.decision), ["migration-required", "compatible"]);
  assert.equal(await readFile(join(directory, "old-client.json"), "utf8"), original);
} finally { await rm(directory, { recursive: true, force: true }); }
console.log("connected-contracts: composition, HTTP, recursive types and consumer checks passed");
