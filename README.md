# SafeShape

Runtime contracts for TypeScript: define one schema, validate unknown input at
runtime, infer static types, and generate tooling artifacts from the same source.

[![npm package](https://img.shields.io/npm/v/safe-shape?label=npm%20safe-shape)](https://www.npmjs.com/package/safe-shape)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.10-339933)](package.json)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-3178c6)](docs/type-system.md)
[![ESM](https://img.shields.io/badge/module-ESM-4b5563)](package.json)
[![release gate](https://img.shields.io/badge/release%20gate-build%20%2B%20tests%20%2B%20benchmarks-16a34a)](docs/release.md)

<p align="center">
  <img src="docs/assets/safe-shape-demo.gif" alt="SafeShape terminal demo showing install, schema definition, validation, diagnostics, and CLI export" width="760">
</p>

## Why SafeShape

TypeScript types disappear at runtime. SafeShape keeps the runtime boundary
explicit: no hidden coercion, immutable schemas, stable diagnostics, and strong
type inference from the contract you actually execute.

Use SafeShape when data crosses a trust boundary:

- API requests and responses.
- JSON files and config.
- CLI input and generated artifacts.
- Webhook payloads and integration events.
- Any `unknown` value that must become typed data.

## How It Differs From Zod

Zod is the broader validation ecosystem today. SafeShape is intentionally
narrower: it treats runtime schemas as public contracts that must stay explicit,
documented, toolable, and release-tested.

| Decision | Zod | SafeShape |
| --- | --- | --- |
| Primary goal | TypeScript-first schema validation | Runtime contract platform |
| API shape | Broad convenience surface | Conservative stable surface |
| Coercion | Rich convenience APIs, including coercion-oriented workflows | No hidden coercion; transforms are explicit |
| Tooling | Large ecosystem and built-in conversion features | First-party CLI, JSON Schema export, TypeScript generation, validation reports |
| HTTP boundaries | Usually handled through adapters or app code | First-party framework-neutral HTTP helpers |
| Contract evolution | Application-specific tooling | Deterministic input/output graph snapshots, fingerprints, recursion, and conservative compatibility reports |
| Ecosystem protocol | Standard Schema support | Native synchronous Standard Schema V1 plus side-aware Standard JSON Schema adapters and richer immutable diagnostics |
| Tagged composition | Discriminated union validation | Selected-branch diagnostics plus first-party Contract IR, snapshots, JSON Schema, and TypeScript artifacts |
| Failed unions | Generic union failure is the common baseline | Ordered recursive diagnostics for every failed branch, with original paths and no best-branch heuristic |
| Cross-field rules | Custom refinement hooks | Stable-id opaque rules with relative single-issue paths or ordered multi-issue collectors preserved through Standard Schema, CLI, validation, and HTTP |
| Toolable constraints | Broad validation surface | Exact decimal `multipleOf`, constrained record keys, and explicit object policies retain one meaning across runtime, Contract IR, compatibility, JSON Schema, and CLI |
| Release posture | Mature general-purpose library | Contract-first release gate with tests, examples, benchmarks, consumer install, audit, and pack dry-run |

Choose Zod when you need the largest ecosystem and the widest validation feature
set. Choose SafeShape when you want a smaller contract layer with explicit
runtime behavior, stable diagnostics, first-party tooling, and package boundaries
that are designed for API stability.

## Quick Start

Install the full runtime and tooling surface:

```sh
npm install safe-shape
```

Define a schema and validate unknown input:

```ts
import { integer, object, string, type Infer } from "safe-shape";

const User = object({
  id: string({ minLength: 1, maxLength: 100 }),
  age: integer({ minimum: 0, maximum: 150 }).optional(),
});

type User = Infer<typeof User>;

const result = User.safeParse({ id: "user_1", age: 42 });

if (!result.success) {
  console.error(result.error.issues);
} else {
  const user: User = result.data;
  console.log(user.id);
}
```

SafeShape validates without coercion. `{ age: "42" }` is invalid until you add an
explicit transform.

## CLI Example

SafeShape also ships a CLI. Use it to turn runtime contracts into generated
artifacts:

```sh
safe-shape --json schema export \
  --module ./dist/contracts/user.js \
  --export User \
  --schema https://json-schema.org/draft/2020-12/schema \
  --out ./dist/contracts/user.schema.json
```

```sh
safe-shape --json schema types \
  --module ./dist/contracts/user.js \
  --export User \
  --name User \
  --out ./dist/contracts/user.d.ts
```

Store a reviewable contract baseline and block incompatible changes in CI:

```sh
safe-shape contract snapshot \
  --module ./dist/contracts/user.js \
  --export User \
  --id user \
  --format v2 \
  --out ./.safe-shape/user.contract.json

safe-shape --json contract check \
  --module ./dist/contracts/user.js \
  --export User \
  --against ./.safe-shape/user.contract.json \
  --side input \
  --compatibility backward
```

The CLI is machine-readable under `--json`, treats validation failures as
command results, includes migration decisions in compatibility reports, and
does not require authentication. Snapshot v1 remains the default; v2 is
explicit for recursive and input/output graph contracts.

## Release Metrics

Current stable release gate:

| Signal | Status |
| --- | --- |
| Packages | 8 publishable packages |
| Unit tests | 205 passing tests |
| Consumer install | Tarball install smoke check passes |
| Examples | Runnable examples pass |
| Security audit | 0 known vulnerabilities |
| Benchmarks | 18 runtime and compatibility scenarios |
| Package dry run | `npm pack --workspaces --dry-run` passes |

Sample local benchmark run on Node.js `v20.10.0` / macOS arm64:

| Scenario | Throughput |
| --- | ---: |
| Primitive string `safeParse` valid | 8,987,633 ops/sec |
| Formatted email string `safeParse` valid | 5,208,752 ops/sec |
| Decimal `multipleOf` `safeParse` valid | 2,551,484 ops/sec |
| Constrained record `safeParse` valid | 1,212,756 ops/sec |
| Strip object `safeParse` valid | 1,198,829 ops/sec |
| Passthrough object `safeParse` valid | 741,364 ops/sec |
| Object user `safeParse` valid | 208,957 ops/sec |
| Standard Schema user `validate` valid | 213,828 ops/sec |
| Union event `safeParse` valid | 38,315 ops/sec |
| Union event `safeParse` invalid with branch diagnostics | 14,564 ops/sec |
| Discriminated union event `safeParse` valid | 697,471 ops/sec |
| Intersection string `safeParse` valid | 3,867,499 ops/sec |
| Array users `safeParse` valid | 8,703 ops/sec |
| Object user `safeParse` invalid | 71,471 ops/sec |
| Recursive tree `safeParse` valid | 376,573 ops/sec |
| Contract compatibility widening safe | 41,236 ops/sec |
| Contract compatibility narrowing breaking | 40,276 ops/sec |
| Recursive contract v2 compatibility widening safe | 11,131 ops/sec |

Benchmark results are execution evidence, not fixed release thresholds. Re-run
them locally with:

```sh
npm run build
npm run benchmarks:check
```

## Packages

Install `safe-shape` when you want the complete public surface from one package.
Import only what each module needs:

```ts
import { object, string, validateSchema } from "safe-shape";
```

Use narrower packages when you want strict dependency boundaries:

| Package | Purpose |
| --- | --- |
| `safe-shape` | Umbrella package that re-exports runtime and tooling APIs |
| `@safe-shape/core` | Runtime schemas, parsing, diagnostics, and type inference |
| `@safe-shape/compat` | Deterministic snapshots and compatibility analysis |
| `@safe-shape/http` | Framework-neutral HTTP boundary helpers |
| `@safe-shape/json-schema` | JSON Schema export |
| `@safe-shape/typescript` | TypeScript declaration generation |
| `@safe-shape/validation` | JSON-friendly validation reports |
| `@safe-shape/cli` | Command-line tooling |

## Design Principles

- Runtime first.
- API stability over feature count.
- Immutable schemas and parse results.
- Rich diagnostics with stable issue paths.
- Correctness before performance.
- Performance before convenience.
- No magic and no hidden coercion.

## Documentation

- [Migrating from 1.x to 2.0](docs/migration-1-to-2.md)
- [Project integration](docs/integration.md)
- [Core API](docs/api/core.md)
- [Contract compatibility](docs/api/compat.md)
- [CLI API](docs/api/cli.md)
- [HTTP helpers](docs/api/http.md)
- [JSON Schema export](docs/api/json-schema.md)
- [TypeScript generation](docs/api/typescript.md)
- [Validation reports](docs/api/validation.md)
- [Benchmarks](docs/benchmarks.md)
- [Release workflow](docs/release.md)
- [Contract checks in CI](docs/ci.md)

## Local Development

```sh
npm install
npm run build
npm run test
npm run release:check
```

Use the built CLI without a global install:

```sh
npm run cli:doctor
```

Runnable examples live in [examples](examples/README.md):

```sh
npm run examples:check
```

## Project Status

SafeShape is on the `1.0.x` stable API release line. The release gate covers
metadata checks, build, typecheck, tests, examples, benchmarks, consumer tarball
installation, npm audit, and package dry-run.
