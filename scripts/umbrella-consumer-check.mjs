import assert from "node:assert/strict";
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { resolve } from "node:path";

/** Install only the umbrella; local registry metadata resolves unpublished scopes. */
export async function checkUmbrellaInstall({ rootDir, workspaceDir, tarballDir, version, packages, run }) {
  const metadata = new Map();
  const artifacts = new Map();
  for (const pkg of packages) {
    const path = pkg.name === "safe-shape" ? "safe-shape" : pkg.name.slice("@safe-shape/".length);
    const manifest = JSON.parse(await readFile(resolve(rootDir, "packages", path, "package.json"), "utf8"));
    metadata.set(pkg.name, { manifest, filename: pkg.tarball });
    artifacts.set(pkg.tarball, await readFile(resolve(tarballDir, pkg.tarball)));
  }
  const server = createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url, "http://localhost").pathname.slice(1));
    const archive = path.startsWith("archives/") ? artifacts.get(path.slice(9)) : undefined;
    if (archive) { response.setHeader("content-type", "application/octet-stream"); response.end(archive); return; }
    const entry = metadata.get(path);
    if (!entry) { response.statusCode = 404; response.end(); return; }
    const origin = `http://127.0.0.1:${server.address().port}`;
    const published = { ...entry.manifest, dist: { tarball: `${origin}/archives/${entry.filename}`, integrity: `sha512-${createHash("sha512").update(artifacts.get(entry.filename)).digest("base64")}` } };
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify({ name: entry.manifest.name, "dist-tags": { latest: version }, versions: { [version]: published } }));
  });
  await new Promise((accept, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", accept); });
  try {
    const app = resolve(workspaceDir, "umbrella-only");
    await rm(app, { recursive: true, force: true });
    await mkdir(app, { recursive: true });
    await writeFile(resolve(app, "package.json"), JSON.stringify({ name: "umbrella-only-consumer", private: true, type: "module" }));
    await run("npm", ["--cache", resolve(rootDir, ".npm-cache"), "install", "--ignore-scripts", "--audit=false", "--fund=false", "--fetch-retries=0", `--@safe-shape:registry=http://127.0.0.1:${server.address().port}`, resolve(tarballDir, `safe-shape-${version}.tgz`)], app);
    const project = JSON.parse(await readFile(resolve(app, "package.json"), "utf8"));
    assert.deepEqual(Object.keys(project.dependencies), ["safe-shape"]);
    assert.equal(JSON.parse(await readFile(resolve(app, "node_modules/@safe-shape/mcp/package.json"), "utf8")).version, version);
    await writeFile(resolve(app, "check.mjs"), `import assert from 'node:assert/strict';
import {object,string} from 'safe-shape';
import {defineMcpTool,createValidatedMcpHandler,safeToMcpToolDefinition} from 'safe-shape/mcp';
const tool=defineMcpTool({name:'echo',description:'Echo',input:object({text:string()}),output:object({text:string()})});
assert.equal(safeToMcpToolDefinition(tool).success,true);
const run=createValidatedMcpHandler(tool,value=>value);
assert.equal((await run({text:1})).isError,true);
assert.deepEqual((await run({text:'ok'})).structuredContent,{text:'ok'});`);
    await run(process.execPath, [resolve(app, "check.mjs")], app);
    const bin = resolve(app, "node_modules/.bin/safe-shape-mcp");
    await run(bin, ["--help"], app);
    await mkdir(resolve(app, "examples"), { recursive: true });
    for (const file of ["mcp-contracts.mjs", "mcp.manifest.json", "mcp-workflow.mjs"]) {
      await writeFile(resolve(app, "examples", file), await readFile(resolve(rootDir, "examples", file)));
    }
    await run(process.execPath, [resolve(app, "examples/mcp-workflow.mjs"), bin], app);
  } finally {
    server.closeAllConnections();
    await new Promise((accept, reject) => server.close(error => error ? reject(error) : accept()));
  }
}
