import { object, string, optional, number, type InferInput, type InferOutput } from "@safe-shape/core";
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends 1 & T ? true : false;
const schema = object({ id: string(), size: string().transform((v) => v.length), age: optional(number()) });
const input: InferInput<typeof schema> = { id: "a", size: "abc" };
const output: InferOutput<typeof schema> = { id: "a", size: 3 };
type Output = Expect<Equal<InferOutput<typeof schema>["size"], number>>;
type NotAny = Expect<Equal<IsAny<InferOutput<typeof schema>>, false>>;
// @ts-expect-error transformed output cannot remain string
const wrong: InferOutput<typeof schema> = { id: "a", size: "abc" };
// @ts-expect-error required id remains required
const missing: InferInput<typeof schema> = { size: "abc" };
// @ts-expect-error optional numeric field retains its type
const wrongOptional: InferInput<typeof schema> = { id: "a", size: "abc", age: "1" };
