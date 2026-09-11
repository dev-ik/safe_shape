import { array, boolean, enum as enumeration, literal, nullable, never, number, object, optional, string, union, unknown, type Schema } from "@safe-shape/core";
import type { CompatibilityDirection, ContractGraphNode, ContractSide } from "./index.js";

type ScalarValue = string | number | boolean | null;
export type CounterexampleValue = ScalarValue | readonly CounterexampleValue[] | { readonly [key: string]: CounterexampleValue };
export type CounterexampleUnavailableReason = "unsupported-side" | "unsupported-domain" | "candidate-limit" | "construction-limit" | "no-witness-found";
interface CounterexampleContext {
  readonly direction: CompatibilityDirection;
  readonly side: ContractSide;
  readonly source: "previous" | "next";
  readonly target: "previous" | "next";
  readonly path: readonly [];
}
export type ContractCounterexample = CounterexampleContext & (
  | { readonly status: "available"; readonly value: CounterexampleValue }
  | { readonly status: "unavailable"; readonly reason: CounterexampleUnavailableReason }
);

function scalar(value: unknown): value is ScalarValue {
  return value === null || typeof value === "string" || typeof value === "boolean" ||
    (typeof value === "number" && Number.isFinite(value) && !Object.is(value, -0));
}

interface SearchBudget { constructionLimited: boolean; work: number; }
interface Validators { schemas: Map<ContractGraphNode, Schema<unknown>>; nodes: number; }
class Unsupported extends Error {}
class ConstructionLimit extends Error {}

function reconstruct(node: ContractGraphNode, context: Validators, depth = 0): Schema<unknown> {
  if (depth > 4 || ++context.nodes > 128) throw new ConstructionLimit();
  if (node.refinements?.length) throw new Unsupported();
  let schema: Schema<unknown>;
  const child = (value: ContractGraphNode) => reconstruct(value, context, depth + 1);
  switch (node.kind) {
    case "literal": if (!scalar(node.value)) throw new Unsupported(); schema = literal(node.value); break;
    case "enum": schema = enumeration(node.values as readonly [string | number, ...(string | number)[]]); break;
    case "number": schema = number(node.constraints); break;
    case "boolean": schema = boolean(); break;
    case "string":
      if (node.constraints?.pattern !== undefined || node.constraints?.format !== undefined) throw new Unsupported();
      schema = string(node.constraints); break;
    case "unknown": schema = unknown(); break;
    case "never": schema = never(); break;
    case "optional": schema = optional(child(node.inner)); break;
    case "nullable": schema = nullable(child(node.inner)); break;
    case "array": schema = array(child(node.item), node.constraints); break;
    case "union": {
      if (node.choices.length > 8) throw new ConstructionLimit();
      schema = union(node.choices.map(child) as [Schema<unknown>, ...Schema<unknown>[]]); break;
    }
    case "object": {
      if (Object.keys(node.shape).length > 16) throw new ConstructionLimit();
      const shape: Record<string, Schema<unknown>> = {};
      for (const [key, value] of Object.entries(node.shape)) {
        // Reject noncanonical required/optional combinations instead of changing semantics.
        if (node.required.includes(key) === (value.kind === "optional")) throw new Unsupported();
        Object.defineProperty(shape, key, { value: child(value), enumerable: true });
      }
      schema = object(shape, { unknownProperties: node.unknownProperties }); break;
    }
    default: throw new Unsupported();
  }
  context.schemas.set(node, schema);
  return schema;
}

// Adjacent IEEE-754 values avoid assuming that +/- 1 crosses a tight bound.
function adjacent(value: number, up: boolean): number {
  if (value === 0) return up ? Number.MIN_VALUE : -Number.MIN_VALUE;
  const view = new DataView(new ArrayBuffer(8));
  view.setFloat64(0, value);
  const bits = view.getBigUint64(0);
  view.setBigUint64(0, bits + ((value > 0) === up ? 1n : -1n));
  return view.getFloat64(0);
}

function* candidates(node: ContractGraphNode, budget: { constructionLimited: boolean }): Generator<CounterexampleValue> {
  if (node.kind === "literal" && scalar(node.value)) yield node.value;
  if (node.kind === "enum") yield* node.values;
  if (node.kind === "string") {
    const lengths = new Set([0, 1]);
    for (const bound of [node.constraints?.minLength, node.constraints?.maxLength]) {
      if (bound !== undefined) for (const length of [bound - 1, bound, bound + 1]) lengths.add(length);
    }
    for (const length of lengths) {
      if (length < 0) continue;
      if (length > 1024) { budget.constructionLimited = true; continue; }
      yield "a".repeat(length);
      if (length > 0) yield "b".repeat(length);
    }
  }
  if (node.kind === "number") {
    for (const bound of [node.constraints?.minimum, node.constraints?.maximum]) {
      if (bound === undefined) continue;
      for (const value of [bound, adjacent(bound, false), adjacent(bound, true), Math.floor(bound), Math.ceil(bound)]) {
        if (scalar(value)) yield value;
      }
    }
  }
}

const seeds: readonly ScalarValue[] = [null, false, true, "", 0, -1, 1];
function withinCompositeLimit(value: CounterexampleValue): boolean {
  if (value === null || typeof value !== "object") return true;
  const pending = [value as CounterexampleValue];
  let nodes = 0, characters = 0;
  while (pending.length) {
    if (++nodes > 1024) return false;
    const item = pending.pop()!;
    if (typeof item === "string") characters += item.length;
    else if (item !== null && typeof item === "object") {
      if (!Array.isArray(item)) for (const key of Object.keys(item)) characters += key.length;
      pending.push(...Object.values(item));
    }
    if (characters > 65536) return false;
  }
  return true;
}
function own(node: Extract<ContractGraphNode, { kind: "object" }>, key: string): ContractGraphNode | undefined {
  return Object.hasOwn(node.shape, key) ? node.shape[key] : undefined;
}
function* generate(node: ContractGraphNode, hint: ContractGraphNode | undefined,
  budget: SearchBudget, schemas: Map<ContractGraphNode, Schema<unknown>>): Generator<CounterexampleValue> {
  if (++budget.work > 4096) { budget.constructionLimited = true; return; }
  if (hint?.kind === "union" && node.kind !== "union") {
    for (const choice of hint.choices) yield* generate(node, choice, budget, schemas);
    return;
  }
  const pool = (value: ContractGraphNode, target: ContractGraphNode | undefined): CounterexampleValue[] => {
    const result: CounterexampleValue[] = [];
    const validator = schemas.get(value)!;
    for (const candidate of generate(value, target, budget, schemas)) {
      if (++budget.work > 4096) { budget.constructionLimited = true; break; }
      if (!withinCompositeLimit(candidate)) { budget.constructionLimited = true; continue; }
      if (!validator.safeParse(candidate).success) continue;
      if (result.length === 16) { budget.constructionLimited = true; break; }
      result.push(candidate);
    }
    return result;
  };
  if (node.kind === "optional" || node.kind === "nullable") {
    if (node.kind === "nullable") yield null;
    yield* generate(node.inner, hint?.kind === "optional" || hint?.kind === "nullable" ? hint.inner : hint, budget, schemas);
  } else if (node.kind === "union") {
    for (const choice of node.choices) yield* generate(choice, hint, budget, schemas);
  } else if (node.kind === "object") {
    const target = hint?.kind === "object" ? hint : undefined;
    const values = new Map<string, CounterexampleValue[]>();
    const base: Record<string, CounterexampleValue> = {};
    for (const [key, value] of Object.entries(node.shape)) {
      const choices = pool(value, target && own(target, key));
      values.set(key, choices);
      if (node.required.includes(key)) {
        if (!choices.length) return;
        Object.defineProperty(base, key, { value: choices[0]!, enumerable: true });
      }
    }
    yield base;
    for (const [key, choices] of values) for (const value of choices) yield { ...base, [key]: value };
    if (node.unknownProperties !== "reject") {
      let key = "extra";
      while (Object.hasOwn(node.shape, key) || (target && Object.hasOwn(target.shape, key))) key += "_";
      yield { ...base, [key]: null };
      if (target) for (const key of Object.keys(target.shape)) {
        if (!Object.hasOwn(node.shape, key)) for (const value of seeds) yield { ...base, [key]: value };
      }
    }
  } else if (node.kind === "array") {
    const target = hint?.kind === "array" ? hint : undefined;
    const values = pool(node.item, target?.item);
    const lengths = new Set([0, 1]);
    for (const bound of [node.constraints?.minLength, node.constraints?.maxLength, target?.constraints?.minLength, target?.constraints?.maxLength]) {
      if (bound !== undefined) for (const length of [bound - 1, bound, bound + 1]) lengths.add(length);
    }
    for (const length of lengths) {
      if (length < 0) continue;
      if (length > 16) { budget.constructionLimited = true; continue; }
      if (length === 0) { yield []; continue; }
      if (!values.length) continue;
      const base = Array<CounterexampleValue>(length).fill(values[0]!);
      yield base;
      for (const value of values) yield [value, ...base.slice(1)];
    }
  } else {
    yield* candidates(node, budget);
    if (hint) yield* candidates(hint, budget);
    yield* seeds;
  }
}

function freezeValue(value: CounterexampleValue): CounterexampleValue {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freezeValue(child);
    Object.freeze(value);
  }
  return value;
}

export function constructCounterexample(previous: ContractGraphNode, next: ContractGraphNode,
  direction: CompatibilityDirection, side: ContractSide): ContractCounterexample {
  const context: CounterexampleContext = {
    direction, side, source: direction === "backward" ? "previous" : "next",
    target: direction === "backward" ? "next" : "previous", path: Object.freeze([]),
  };
  const unavailable = (reason: CounterexampleUnavailableReason): ContractCounterexample =>
    Object.freeze({ ...context, status: "unavailable", reason });
  if (side !== "input") return unavailable("unsupported-side");
  const sourceNode = direction === "backward" ? previous : next;
  const targetNode = direction === "backward" ? next : previous;
  const schemas = new Map<ContractGraphNode, Schema<unknown>>();
  let source: Schema<unknown>, target: Schema<unknown>;
  try {
    source = reconstruct(sourceNode, { schemas, nodes: 0 });
    target = reconstruct(targetNode, { schemas, nodes: 0 });
  } catch (error) {
    if (error instanceof ConstructionLimit) return unavailable("construction-limit");
    if (error instanceof Unsupported) return unavailable("unsupported-domain");
    throw error;
  }
  const budget: SearchBudget = { constructionLimited: false, work: 0 };
  function* values() {
    yield* generate(sourceNode, targetNode, budget, schemas);
    yield* generate(targetNode, sourceNode, budget, schemas);
  }
  let attempts = 0;
  for (const value of values()) {
    if (attempts++ === 128) return unavailable("candidate-limit");
    if (!withinCompositeLimit(value)) { budget.constructionLimited = true; continue; }
    if (source.safeParse(value).success && !target.safeParse(value).success) return Object.freeze({ ...context, status: "available", value: freezeValue(value) });
  }
  return unavailable(budget.constructionLimited ? "construction-limit" : "no-witness-found");
}
