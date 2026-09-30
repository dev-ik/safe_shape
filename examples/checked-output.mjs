import assert from "node:assert/strict";
import { string, number, literal, object, checkSchemaConnection, safeToJsonSchema } from "safe-shape";

const Page = object({
  page: string({ pattern: "^[0-9]+$" }).transform(Number)
    .pipe(number({ integer: true, minimum: 1, maximum: 100 })),
});
const Consumer = object({ page: number({ integer: true, minimum: 1 }) });
const report = checkSchemaConnection(Page, Consumer, { producerId: "http-query", consumerId: "application" });
assert.equal(report.compatible, true);
assert.equal(report.evidence, "output-bound");
assert.deepEqual(Consumer.parse(Page.parse({ page: "12" })), { page: 12 });
assert.equal(Page.safeParse({ page: "0" }).success, false);
assert.equal(Page.safeParse({ page: "abc" }).success, false);
assert.equal(Page.safeParse({ page: 12 }).success, false);

const exported = safeToJsonSchema(Page, { side: "output", mode: "output-bound", target: "draft-2020-12" });
assert.equal(exported.success, true);
assert.equal(exported.warnings[0].code, "json_schema.output.bound");
assert.equal(exported.schema.properties.page.type, "integer");
assert.equal(safeToJsonSchema(Page, { side: "output" }).success, false);

const constant = string().transform(() => 1).pipe(number({ minimum: 1, maximum: 100 }));
const review = checkSchemaConnection(constant, literal(1));
assert.equal(review.status, "unknown");
assert.equal(review.counterexample.status, "unavailable");
assert.equal(review.migration.decision, "manual-review");
console.log("checked-output: runtime, export, safe connection and conservative review passed");
