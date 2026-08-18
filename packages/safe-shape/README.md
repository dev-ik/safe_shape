# safe-shape

Umbrella package for SafeShape runtime contracts and tooling.

Install this package when a project wants the full SafeShape surface available
through one dependency:

```sh
npm install safe-shape
```

Import only the helpers needed by each module:

```ts
import { object, string, validateSchema } from "safe-shape";

const userSchema = object({
  id: string(),
});

const report = validateSchema(userSchema, { id: "user_1" });
```

The umbrella export includes structured composition helpers such as
`discriminatedUnion()` and `intersection()` together with their snapshot and
generator support.
It also re-exports toolable string pattern and exact-format constraints.
Exact numeric `multipleOf` and constrained record keys are available through
the same umbrella export.
So are explicit `reject`, `strip`, and `passthrough` object policies.
Ordinary union failures also retain ordered recursive branch diagnostics through
the core, validation, and CLI exports.
Schemas also expose `refine(..., { path })` for one addressable issue and
`refineWithIssues(collector, { id })` for synchronous ordered multi-issue
custom rules.
Every schema implements Standard Schema V1 directly through `~standard`, and
the umbrella package re-exports the corresponding inference types.
Use the re-exported `createStandardJsonSchema()` when a consumer also requires
Standard JSON Schema V1 input/output conversion.
Use `safeToJsonSchema()` when build tooling needs structured diagnostics for
unrepresentable refinements or opaque output without catching exceptions.

The package re-exports:

- `@safe-shape/core`
- `@safe-shape/compat`
- `@safe-shape/http`
- `@safe-shape/json-schema`
- `@safe-shape/typescript`
- `@safe-shape/validation`

Installing this package also installs `@safe-shape/cli`, which provides the
`safe-shape` CLI binary.

Use the scoped packages directly when a project wants the narrowest dependency
surface.
