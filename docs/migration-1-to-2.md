# Migrating from SafeShape 1.x to 2.0

SafeShape 2.0 keeps the runtime-first builder API and the existing snapshot v1
format. Most applications can upgrade incrementally: align package versions,
compile, run contract checks against reviewed baselines, and address the
source-sensitive changes below.

## Requirements

- Node.js `>=20.10`.
- Upgrade `safe-shape` and every installed `@safe-shape/*` package together.
- Keep strict TypeScript checking enabled during the migration.

For an umbrella installation:

```sh
npm install safe-shape@2
```

For scoped packages, keep every version on the same major:

```sh
npm install @safe-shape/core@2 @safe-shape/validation@2
npm install --save-dev @safe-shape/compat@2 @safe-shape/cli@2
```

## Recommended Upgrade Order

1. Upgrade all SafeShape packages without changing stored contract snapshots.
2. Run the compiler and tests to find exhaustive type switches and requiredness
   assumptions.
3. Run existing v1 compatibility checks against the reviewed v1 baselines.
4. Update diagnostic and artifact consumers for the additions listed below.
5. Adopt snapshot v2 only where recursion or separate input/output checks are
   needed.
6. Review and commit every new baseline; never regenerate baselines inside the
   check job.

## Source-Sensitive Changes

### Schema input and output types

`Schema` now models output and input separately:

```ts
import {
  string,
  type Infer,
  type InferInput,
  type InferOutput,
  type Schema,
} from "@safe-shape/core";

const length = string().transform((value) => value.length, {
  id: "string-length/v1",
});

type Input = InferInput<typeof length>;   // string
type Output = InferOutput<typeof length>; // number
type ExistingAlias = Infer<typeof length>; // number

declare const outputSchema: Schema<number, string>;
```

The first `Schema` generic remains the output type, so an existing
`Schema<T>` annotation still means `Schema<T, T>`. `Infer<TSchema>` remains an
output alias. Use `InferInput` at untrusted boundaries and `InferOutput` after
successful parsing.

### Object properties are optional only when declared optional

An object key is omittable only when its property schema is explicitly wrapped
with `optional()` or `.optional()`. A schema whose output type happens to
include `undefined` does not make the key optional.

```ts
import { object, optional, string } from "@safe-shape/core";

const user = object({
  id: string(),
  nickname: optional(string()),
});
```

If 1.x code relied on incidental `undefined` to omit a property, add the
explicit optional wrapper and re-run both type and runtime tests.

### Unknown object properties are explicit

The default object policy is `reject`. Choose `strip` or `passthrough` only
where the boundary intentionally needs it:

```ts
const stripped = object(
  { id: string() },
  { unknownProperties: "strip" },
);
```

`strip` removes unknown keys from output. `passthrough` preserves them. This
difference is part of output compatibility and should not be changed merely to
make a contract check pass.

### Exhaustive diagnostic and definition switches

2.0 adds public issue codes and schema-definition variants for its new schema
kinds, references, and opaque behavior. Code using an exhaustive `switch` over
`IssueCode` or `SchemaDefinition["kind"]` must handle the new variants. Keep a
`never` assertion in these switches so later additions remain visible during
compilation.

Failed ordinary unions may now include an ordered `branches` tree in JSON
validation reports. Existing consumers that ignore unknown object properties
continue to work; exact JSON snapshots and strict decoders must be updated.

### Refinements and JSON Schema export

Refinements are intentionally opaque to JSON Schema. Export now fails instead
of silently producing a weaker artifact. Use the non-throwing API in build
tools and treat failure as a contract-generation error:

```ts
import { safeToJsonSchema } from "@safe-shape/json-schema";

const result = safeToJsonSchema(schema);

if (!result.success) {
  console.error(result.issues);
  process.exitCode = 1;
}
```

Give ordinary refinements and transforms stable semantic ids when their
behavior is versioned in contract snapshots. `refineWithIssues()` requires an
id and can emit multiple ordered, path-aware issues. Change an id whenever the
opaque behavior changes; an equal id is an assertion of equal semantics.

## Contract Snapshot Migration

Snapshot v1 remains the default. Its supported acyclic trees and fingerprints
are unchanged, so existing reviewed files can stay in place:

```sh
safe-shape contract check \
  --module ./dist/contracts/user.js \
  --export userSchema \
  --against ./.safe-shape/user.contract.json \
  --compatibility backward
```

Snapshot v2 is opt-in. Use it for recursive contracts or for independent input
and output compatibility:

```sh
safe-shape contract snapshot \
  --module ./dist/contracts/tree.js \
  --export treeSchema \
  --id tree \
  --format v2 \
  --out ./.safe-shape/tree.v2.contract.json

safe-shape --json contract check \
  --module ./dist/contracts/tree.js \
  --export treeSchema \
  --against ./.safe-shape/tree.v2.contract.json \
  --side input \
  --compatibility backward
```

V1 and v2 use separate parsing and comparison APIs. Create a new reviewed v2
baseline instead of overwriting a v1 file in place. `contract check`
auto-detects the stored format; `--side` is valid only for v2 and defaults to
`input`.

Compatibility command exit codes are stable and suitable for CI:

- `0`: `safe` or `annotation-only`;
- `2`: `breaking`, `risky`, or `unknown` compatibility result;
- `1`: operational error, including malformed snapshots or invalid flags.

JSON compatibility output includes `format` and `migration`. Use
`migration.decision` to distinguish `migration-required` from `manual-review`;
do not infer that decision from human-readable messages.

## Package Choice

Existing scoped imports remain valid. Use `safe-shape` when one dependency and
the CLI binary are convenient, or retain narrow packages to keep capability
boundaries explicit:

- `@safe-shape/core`: schemas, parsing, diagnostics, type inference;
- `@safe-shape/compat`: snapshots and compatibility reports;
- `@safe-shape/validation`: JSON-friendly reports;
- `@safe-shape/http`: framework-neutral HTTP boundaries;
- `@safe-shape/json-schema`: JSON Schema artifacts;
- `@safe-shape/typescript`: TypeScript declaration artifacts;
- `@safe-shape/cli`: command-line workflows.

## Consumer Verification

Run the checks that represent the application's real boundaries:

```sh
npm run build
npm test
npm run contracts:validate
npm run contracts:check
```

Before accepting the migration, verify:

- all SafeShape package versions are aligned;
- input sites use `InferInput` and post-parse sites use `InferOutput` where the
  two types differ;
- omitted object keys have explicit optional schemas;
- exact issue/report snapshots include the new diagnostic structure;
- JSON Schema generation rejects unsupported opaque behavior visibly;
- every compatibility result with exit code `2` was reviewed;
- new v2 baselines were reviewed rather than generated during CI.

See [Project Integration](integration.md), [Contract Compatibility](api/compat.md),
and [Contract Checks in CI](ci.md) for complete examples.
