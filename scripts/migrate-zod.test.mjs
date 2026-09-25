import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import ts from "typescript";
import { migrateZodSource } from "./migrate-zod.mjs";

test("migration preserves supported runtime acceptance and explicit object policies", async () => {
  const source = `import { z } from "zod";
export const User = z.object({ id: z.string(), age: z.number().min(0).max(100).optional() });
export const Names = z.array(z.string()).min(1).max(3);
export const Event = z.union([z.strictObject({ type: z.literal("a") }), z.looseObject({ type: z.literal("b") })]);
export type User = z.infer<typeof User>;`;
  const result = migrateZodSource(source);
  assert.ok(result.ok, JSON.stringify(result));
  assert.match(result.source, /unknownProperties: "strip"/);
  await mkdir(resolve(".tmp"), { recursive: true });
  const directory = await mkdtemp(resolve(".tmp/migration-"));
  try {
    const originalPath = join(directory, "original.mjs");
    const convertedPath = join(directory, "converted.mjs");
    const original = source.replace('"zod"', JSON.stringify(pathToFileURL(resolve("quality/node_modules/zod/index.js")).href));
    for (const [file, contents] of [[originalPath, original], [convertedPath, result.source]]) await writeFile(file, ts.transpileModule(contents, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText);
    const before = await import(pathToFileURL(originalPath).href);
    const after = await import(pathToFileURL(convertedPath).href);
    const inputs = [null, false, 0, "", {}, { id: "a" }, { id: "a", age: 20, extra: true }, { id: "a", age: -1 }, { id: "a", age: "20" }, [], ["a"], ["a", "b", "c", "d"], { type: "a", extra: true }, { type: "b", extra: true }];
    for (const name of ["User", "Names", "Event"]) for (const input of inputs) {
      const expected = before[name].safeParse(input);
      const actual = after[name].safeParse(input);
      assert.equal(actual.success, expected.success);
      if (actual.success) assert.deepEqual(actual.data, expected.data);
    }
    const typed = join(directory, "converted.ts");
    await writeFile(typed, result.source + '\nconst user: User = { id: "a" };\n// @ts-expect-error age stays numeric\nconst invalid: User = { id: "a", age: "1" };\n');
    const program = ts.createProgram([typed], { strict: true, noEmit: true, types: [], skipLibCheck: true, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, target: ts.ScriptTarget.ES2022 });
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("migration refuses ambiguous semantics and never executes callbacks", () => {
  for (const expression of ['z.literal(0)', 'z.string().min(2)', 'z.string().email()', 'z.coerce.number()', 'z.string().default("x")', 'z.string().transform(() => { throw new Error("EXECUTED") })', 'z.number().min(1).min(2)', 'z.enum(["a", "a"])']) {
    const result = migrateZodSource(`import { z } from "zod"; export const Schema = ${expression};`);
    assert.equal(result.ok, false);
    assert.equal("source" in result, false);
    assert.ok(result.issues[0].line > 0);
  }
  assert.equal(migrateZodSource('import { z } from "zod"; process.exit(99);').ok, false);
});

test("migration CLI refuses overwrite and does not create partial artifacts", async () => {
  await mkdir(resolve(".tmp"), { recursive: true });
  const directory = await mkdtemp(resolve(".tmp/migration-cli-"));
  try {
    const input = join(directory, "schema.ts"), output = join(directory, "output.ts");
    const original = 'import { z } from "zod"; export const Name = z.string();';
    await writeFile(input, original);
    const run = (out) => spawnSync(process.execPath, ["scripts/migrate-zod.mjs", "--input", input, "--out", out], { encoding: "utf8" });
    assert.equal(run(input).status, 1);
    assert.equal(run(output).status, 0);
    const generated = await readFile(output, "utf8");
    assert.equal(run(output).status, 1);
    assert.equal(await readFile(output, "utf8"), generated);
    await writeFile(input, 'import { z } from "zod"; export const Bad = z.coerce.number();');
    assert.equal(run(join(directory, "absent.ts")).status, 2);
    await assert.rejects(readFile(join(directory, "absent.ts")), { code: "ENOENT" });
  } finally { await rm(directory, { recursive: true, force: true }); }
});
