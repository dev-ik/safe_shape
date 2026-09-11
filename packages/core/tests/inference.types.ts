import { array, discriminatedUnion, lazy, literal, nullable, number, object, optional, string,
  type InferInput, type InferOutput, type Schema } from "../src/index.js";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Expect<T extends true> = T;
type IsAny<T> = 0 extends (1 & T) ? true : false;
const user = object({ id: string(), age: optional(number()), label: nullable(string()) });
type User = InferOutput<typeof user>;
type Id = Expect<Equal<User["id"], string>>;
type NotAny = Expect<Equal<IsAny<User>, false>>;
const input: InferInput<typeof user> = { id: "a", label: null };
// @ts-expect-error required field cannot disappear
const missing: User = { label: null };
// @ts-expect-error known fields cannot widen to any
const wrong: User = { id: 1, label: null };
// @ts-expect-error optional numeric field still rejects string
const optionalWrong: User = { id: "a", label: null, age: "1" };
const transformed = string().transform((value) => value.length);
type TransformIn = Expect<Equal<InferInput<typeof transformed>, string>>;
type TransformOut = Expect<Equal<InferOutput<typeof transformed>, number>>;
// @ts-expect-error transformed output is number
const transformWrong: InferOutput<typeof transformed> = "1";
const event = discriminatedUnion("kind", [
  object({ kind: literal("created"), id: string() }),
  object({ kind: literal("removed"), reason: string() }),
]);
function narrow(value: InferOutput<typeof event>) {
  if (value.kind === "created") {
    const id: string = value.id;
    // @ts-expect-error branch-specific fields must remain discriminated
    value.reason;
    return id;
  }
  return value.reason;
}
interface Node { readonly value: string; readonly children: readonly Node[] }
let tree: Schema<Node>;
tree = lazy(() => object({ value: string(), children: array(tree) }), { id: "Node" });
type Recursive = Expect<Equal<InferOutput<typeof tree>, Node>>;
const checked = user.refineAsync(async () => true, { id: "user/v1" });
async function parse() {
  const result = await checked.safeParseAsync(input);
  if (result.success) {
    const id: string = result.data.id;
    // @ts-expect-error async parsing retains known field types
    const bad: number = result.data.id;
    return id;
  }
  // @ts-expect-error failed result cannot provide data
  return result.data;
}
// Compile-only fixture: no callbacks or parses execute during tests.
