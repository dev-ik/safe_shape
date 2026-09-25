import { object, number, string, type InferInput, type InferOutput } from "../src/index.js";

const source = object({ id: string(), age: number().optional() });
const edit = source.omit(["id"]).partial();
const valid: InferInput<typeof edit> = {};
// @ts-expect-error retained numeric field
const invalid: InferInput<typeof edit> = { age: "1" };
const required = source.required();
// @ts-expect-error age is required
const absent: InferOutput<typeof required> = { id: "a" };
// @ts-expect-error undefined is excluded
const undefinedAge: InferOutput<typeof required> = { id: "a", age: undefined };
// @ts-expect-error unknown field
source.pick(["missing"]);
// @ts-expect-error compose before refining
source.refine(() => true).partial();
const extended = source.pick(["id"]).extend({ total: number() });
const result: InferOutput<typeof extended> = { id: "a", total: 1 };
const pipeline = string().transform((v) => v.length).pipe(number());
const input: InferInput<typeof pipeline> = "value";
const output: InferOutput<typeof pipeline> = 5;
// @ts-expect-error incompatible intermediate value
string().pipe(number());
// @ts-expect-error original input is retained
const wrongInput: InferInput<typeof pipeline> = 5;
// @ts-expect-error checked output is numeric
const wrongOutput: InferOutput<typeof pipeline> = "5";
void [valid, invalid, absent, undefinedAge, result, input, output, wrongInput, wrongOutput];
