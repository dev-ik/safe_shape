import { describeOutputBound, number, string, type SchemaContractDescription, type SchemaOutputBound, type InferInput, type InferOutput } from "../src/index.js";

const page = string().transform(Number).pipe(number({ integer: true }));
const bound: SchemaOutputBound = describeOutputBound(page);
const input: InferInput<typeof page> = "1";
const output: InferOutput<typeof page> = 1;
// @ts-expect-error a labelled bound cannot stand in for an exact contract
const exact: SchemaContractDescription = bound;
// @ts-expect-error bound graphs are readonly
bound.graph.root = { kind: "unknown" };
// @ts-expect-error introspection does not widen the validated output type
const invalid: InferOutput<typeof page> = "1";
void [input, output, exact, invalid];
