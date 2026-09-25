import assert from "node:assert/strict";
import test from "node:test";
import { array, boolean, failure, number, object, string, union, ValidationError, type Issue } from "../src/index.js";

function assertFrozenIssues(issues: readonly Issue[]): void {
  assert.ok(Object.isFrozen(issues));
  for (const issue of issues) {
    assert.ok(Object.isFrozen(issue));
    assert.ok(Object.isFrozen(issue.path));
    if (issue.branches) {
      assert.ok(Object.isFrozen(issue.branches));
      for (const branch of issue.branches) {
        assert.ok(Object.isFrozen(branch));
        assertFrozenIssues(branch.issues);
        if (branch.warnings) {
          assert.ok(Object.isFrozen(branch.warnings));
          for (const warning of branch.warnings) assert.ok(Object.isFrozen(warning));
        }
      }
    }
  }
}

test("public errors retain eager Error behavior and recursive immutable diagnostics", async () => {
  const schema = object({
    tag: string().warn(() => false, { id: "tag-warning" }),
    items: array(union([
      string().warn(() => false, { id: "branch-warning" }).refine(() => false, { id: "branch-error" }),
      union([number(), boolean()]),
    ])),
  });
  const input = { tag: "ok", items: ["bad"] };
  const result = schema.safeParse(input);
  assert.ok(!result.success);
  assert.ok(Object.isFrozen(result));
  assert.ok(result.error instanceof Error);
  assert.ok(result.error instanceof ValidationError);
  assert.equal(Object.getOwnPropertyDescriptor(result, "error")?.value, result.error);
  assert.equal(result.error, result.error);
  assert.equal(result.error.name, "ValidationError");
  assert.match(result.error.message, /items\.0/);
  assert.match(result.error.stack!, /^ValidationError:/);
  assert.deepEqual(result.error.issues.map((issue) => issue.path), [["items", 0]]);
  const branches = result.error.issues[0]!.branches!;
  assert.deepEqual(branches.map((branch) => branch.index), [0, 1]);
  assert.deepEqual(branches[0]!.warnings!.map((warning) => [warning.ruleId, warning.path]), [["branch-warning", ["items", 0]]]);
  assert.deepEqual(branches[1]!.issues[0]!.branches!.map((branch) => branch.issues[0]!.code), ["invalid_type", "invalid_type"]);
  assert.deepEqual(result.error.warnings.map((warning) => [warning.ruleId, warning.path]), [["tag-warning", ["tag"]]]);
  assertFrozenIssues(result.error.issues);
  assert.ok(Object.isFrozen(result.error.warnings));
  const asyncResult = await schema.safeParseAsync(input);
  assert.ok(!asyncResult.success);
  assert.notEqual(result.error, asyncResult.error);
  assert.deepEqual(asyncResult.error.issues, result.error.issues);
  assert.deepEqual(asyncResult.error.warnings, result.error.warnings);
  assert.equal(asyncResult.error.message, result.error.message);
  assert.throws(() => schema.parse(input), (error) => {
    assert.ok(error instanceof ValidationError);
    assert.deepEqual(error.issues, result.error.issues);
    return true;
  });
  await assert.rejects(schema.parseAsync(input), ValidationError);
  const standard = await schema["~standard"].validate(input);
  assert.deepEqual(standard.issues, result.error.issues);
});

test("concurrent and reentrant parses keep errors and warning order isolated", async () => {
  const inner = number();
  const schema = object({ value: string()
    .warnAsync(async () => false, { id: "first" })
    .refineAsync(async (value) => inner.safeParse(value).success, { id: "nested" })
    .warnAsync(async () => false, { id: "last" }) });
  const results = await Promise.all(Array.from({ length: 20 }, (_, index) => schema.safeParseAsync({ value: String(index) })));
  const errors = results.map((result) => {
    assert.ok(!result.success);
    assert.deepEqual(result.error.issues.map((issue) => [issue.ruleId, issue.path]), [["nested", ["value"]]]);
    assert.deepEqual(result.error.warnings.map((warning) => warning.ruleId), ["first", "last"]);
    return result.error;
  });
  assert.equal(new Set(errors).size, results.length);
});

test("public failure still snapshots diagnostic containers immediately", () => {
  const source = string().safeParse(1);
  assert.ok(!source.success);
  const issues = [...source.error.issues];
  const result = failure(issues);
  issues.length = 0;
  assert.equal(result.error.issues.length, 1);
  assert.ok(result.error instanceof ValidationError);
  assertFrozenIssues(result.error.issues);
});
