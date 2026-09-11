import {
  array, lazy, object, string, number, enum as enumSchema, union, literal,
  compareContractsV2, createMigrationDiagnostics,
  createHttpCompatibilityPresentation,
} from "safe-shape";

function tree(minLength, ruleId) {
  let schema;
  const name = string({ minLength });
  schema = lazy(() => object({
    name: ruleId ? name.refine(() => true, { id: ruleId }) : name,
    children: array(schema),
  }), { id: "Node" });
  return schema;
}

export const previous = tree(2);
export const widened = tree(1);
export const narrowed = tree(3);
export const opaque = tree(2, "name-policy/v2");
export const previousAmount = number({ minimum: 0 });
export const nextAmount = number({ minimum: 1 });
export const previousName = string({ minLength: 2 });
export const nextName = string({ minLength: 3 });
export const previousPayload = object({
  user: object({ name: string({ minLength: 2 }), role: enumSchema(["admin", "member"]) }),
  events: array(union([literal("created"), literal("updated")]), { minLength: 1 }),
});
export const nextPayload = object({
  user: object({ name: string({ minLength: 3 }), role: literal("admin") }),
  events: array(literal("created"), { minLength: 2 }),
});

// Application-owned presentation: keep the original proof and both projections.
export function explainChange(next, { exchange = "request", compatibility = "backward", side = "input" } = {}) {
  const report = compareContractsV2(previous, next, { compatibility, side });
  return {
    report,
    migration: createMigrationDiagnostics(report),
    http: createHttpCompatibilityPresentation(report, { exchange }),
  };
}
