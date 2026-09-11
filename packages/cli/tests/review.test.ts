import assert from "node:assert/strict";
import test from "node:test";
import { literal, object, string } from "@safe-shape/core";
import { compareContractsV2, createContractCounterexamples, createContractSnapshotV2, createMigrationDiagnostics } from "@safe-shape/compat";
import { renderContractReview } from "../src/review.js";

test("review escapes Markdown and HTML outside code blocks and protects JSON fences", () => {
  const key = "<script>alert(1)</script>\n# injected";
  const previous = object({ [key]: literal("```\n<script>payload</script>") });
  const next = object({ [key]: string({ minLength: 100 }) });
  const report = compareContractsV2(previous, next);
  const markdown = renderContractReview([{
    name: "[click](https://example.com)\n# title <img>", ...report,
    migration: createMigrationDiagnostics(report),
    counterexamples: createContractCounterexamples(createContractSnapshotV2(previous), createContractSnapshotV2(next)),
  }, { name: "error", error: { code: "bad", message: "<script>\n# attack" } }], "Review");
  assert.ok(markdown.includes("&lt;img&gt;"));
  assert.ok(markdown.includes("\\[click\\]"));
  assert.ok(!markdown.includes("\n# injected"));
  assert.ok(!markdown.includes("\n# attack"));
  assert.ok(markdown.includes("````json\n"));
  const beforeJson = markdown.split("````json\n")[0]!;
  assert.ok(!beforeJson.includes("<script>"));
  const json = markdown.split("````json\n")[1]!.split("\n````")[0]!;
  assert.equal(JSON.parse(json)[key], "```\n<script>payload</script>");
});
