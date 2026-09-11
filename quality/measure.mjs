import { performance } from "node:perf_hooks";
import { scenarios, verify } from "./scenarios.mjs";
const [library, moduleUrl, name] = process.argv.slice(2);
const started = performance.now();
const list = await scenarios(library, moduleUrl);
const importMs = performance.now() - started;
const fixture = list.find((entry) => entry.name === name);
if (!fixture) throw new Error(`Unknown scenario: ${name}`);
const constructStart = performance.now();
const schema = fixture.make();
const constructionMs = performance.now() - constructStart;
const asyncCase = name === "async";
const parse = (value) => asyncCase ? schema.safeParseAsync(value) : schema.safeParse(value);
const first = performance.now();
verify(await parse(fixture.valid), fixture, true);
const firstParseMs = performance.now() - first;
const timings = {};
for (const valid of [true, false]) {
  const input = valid ? fixture.valid : fixture.invalid;
  for (let i = 0; i < 2000; i++) verify(await parse(input), fixture, valid);
  const iterations = 20000;
  const start = performance.now();
  for (let i = 0; i < iterations; i++) verify(await parse(input), fixture, valid);
  timings[valid ? "validMs" : "invalidMs"] = (performance.now() - start) / iterations;
}
// GC and equal retained populations; report raw noise rather than negative sizes.
for (let i = 0; i < 3; i++) global.gc();
const before = process.memoryUsage().heapUsed;
const retained = Array.from({ length: 10000 }, () => fixture.make());
for (let i = 0; i < 3; i++) global.gc();
const heapBytes = process.memoryUsage().heapUsed - before;
if (retained.length !== 10000) throw new Error("Lost schemas");
console.log(JSON.stringify({ name, importMs, constructionMs, firstParseMs, ...timings, heapBytes }));
