import assert from "node:assert/strict";

export async function scenarios(library, moduleUrl) {
  const s = await import(moduleUrl);
  const zod = library === "zod";
  const text = (min = 0) => zod ? s.string().min(min) : s.string({ minLength: min });
  const num = () => zod ? s.number().min(0) : s.number({ minimum: 0 });
  const obj = (shape) => zod ? s.strictObject(shape) : s.object(shape);
  const record = (value) => zod ? s.record(s.string(), value) : s.record(value);
  const asyncRule = () => zod ? text().refine(async (v) => v !== "taken") : text().refineAsync(async (v) => v !== "taken", { id: "availability/v1" });
  const definitions = [
    ["constraint", () => text(2), "ab", "a"],
    ["nested", () => obj({ id: text(), profile: obj({ age: num() }) }), { id: "a", profile: { age: 1 } }, { id: "a", profile: { age: -1 } }],
    ["optional-nullable", () => obj({ name: text().optional(), age: num().nullable() }), { age: null }, { name: 1, age: null }],
    ["array", () => s.array(text()), ["a", "b"], ["a", 1]],
    ["tagged", () => s.discriminatedUnion("kind", [obj({ kind: s.literal("a"), value: text() }), obj({ kind: s.literal("b"), value: num() })]), { kind: "a", value: "v" }, { kind: "b", value: "v" }],
    ["union", () => s.union([text(), num()]), "a", false],
    ["record", () => record(text()), { a: "b" }, { a: 1 }],
    ["recursive", () => { let tree; tree = zod ? s.lazy(() => obj({ value: text(), children: s.array(tree) })) : s.lazy(() => obj({ value: text(), children: s.array(tree) }), { id: "Node" }); return tree; }, { value: "a", children: [{ value: "b", children: [] }] }, { value: "a", children: [{ value: 1, children: [] }] }],
    ["transform", () => text().transform((v) => v.length), "abc", 1, 3],
    ["async", asyncRule, "free", "taken"],
  ];
  if (library !== "baseline") definitions.push(
    ["composition", () => {
      const base = obj({ id: text(), label: text() });
      return (zod ? base.pick({ id: true }) : base.pick(["id"])).extend({ age: num() }).partial();
    }, { id: "a", age: 1 }, { id: 1 }],
    ["pipeline", () => text().transform((value) => value.length).pipe(num()), "abc", 1, 3],
  );
  return definitions.map(([name, make, valid, invalid, output]) => ({ name, make, valid, invalid, output: output ?? valid }));
}

export function verify(result, fixture, valid) {
  assert.equal(result.success, valid, `${fixture.name}: wrong acceptance`);
  if (valid) assert.deepEqual(result.data, fixture.output, `${fixture.name}: wrong produced value`);
}

// Consume every branch, including unsuccessful nested union alternatives.
export function consumeIssues(issues) {
  assert.ok(Array.isArray(issues) && issues.length > 0, "Missing issues");
  for (const issue of issues) {
    assert.equal(typeof issue.code, "string");
    assert.equal(typeof issue.message, "string");
    assert.ok(Array.isArray(issue.path));
    for (const segment of issue.path) assert.ok(typeof segment === "string" || typeof segment === "number");
    if (issue.branches) for (const branch of issue.branches) consumeIssues(branch.issues);
    if (issue.errors) for (const branch of issue.errors) consumeIssues(branch);
  }
}
