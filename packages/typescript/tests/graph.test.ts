import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "typescript";
import { array, lazy, object, record, string, number, union, type Schema } from "@safe-shape/core";
import { toTypeScriptType } from "../src/index.js";

test("generated mutually recursive declarations compile and reject wrong consumers", () => {
  interface A { b?: B; }
  interface B { children: readonly A[]; }
  let a: Schema<A>, b: Schema<B>;
  a = lazy(() => object({ b: b.optional() }), { id: "node/a" });
  b = lazy(() => object({ children: array(a) }), { id: "node_a" });
  const source = toTypeScriptType(a, { name: "node_a" });
  assert.equal(source, toTypeScriptType(a, { name: "node_a" }));
  const dir = mkdtempSync(join(tmpdir(), "safe-shape-types-"));
  try {
    const file = join(dir, "consumer.ts");
    writeFileSync(file, `${source}\nconst value: node_a = { b: { children: [{}, { b: { children: [] } }] } };\n// @ts-expect-error recursive property is an array\nconst invalid: node_a = { b: { children: 3 } };\n`);
    const program = ts.createProgram([file], { strict: true, noEmit: true, exactOptionalPropertyTypes: true, types: [], target: ts.ScriptTarget.ES2022 });
    assert.deepEqual(ts.getPreEmitDiagnostics(program).map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("input and checked output types follow the chosen graph", () => {
  const pipeline = string().transform(Number).pipe(number());
  assert.equal(toTypeScriptType(pipeline), "export type SchemaOutput = number;\n");
  assert.equal(toTypeScriptType(pipeline, { side: "input" }), "export type SchemaOutput = string;\n");
  assert.match(toTypeScriptType(object({ id: string() }, { unknownProperties: "strip" }), { side: "input" }), /\[key: string\]: unknown/);
  assert.throws(() => toTypeScriptType(string(), { name: "class" }), /Invalid TypeScript/);
  assert.throws(() => toTypeScriptType(string(), { side: "other" as never }), /side/);
});

test("unproductive recursion fails rather than emitting invalid TypeScript", () => {
  let node: Schema<unknown>;
  node = lazy(() => union([node, string()]), { id: "Loop" });
  assert.throws(() => toTypeScriptType(node), /Unproductive recursive/);
});

test("recursive records and names shadowing helpers emit compilable declarations", () => {
  let dictionary: Schema<unknown>;
  dictionary = lazy(() => record(dictionary), { id: "Record" });
  const source = toTypeScriptType(dictionary, { name: "Dictionary" }) +
    toTypeScriptType(array(string()), { name: "ReadonlyArray" }) +
    toTypeScriptType(record(string()), { name: "Readonly" });
  const dir = mkdtempSync(join(tmpdir(), "safe-shape-recursive-record-"));
  try {
    const file = join(dir, "consumer.ts");
    writeFileSync(file, source);
    const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([file], { strict: true, noEmit: true, types: [], target: ts.ScriptTarget.ES2022 }));
    assert.deepEqual(diagnostics.map((d) => ts.flattenDiagnosticMessageText(d.messageText, "\n")), []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
  assert.match(toTypeScriptType(string(), { name: "readonly" }), /export type readonly/);
});
