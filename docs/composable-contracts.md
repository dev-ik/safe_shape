# Composable runtime contracts

Available in SafeShape 3.2.0 and later. See the [release notes](release-candidate-3.2.0.md).

## Reuse an object without copying its fields

```ts
import { object, string, number } from "safe-shape";

const User = object({ id: string(), name: string(), age: number().optional() });
const CreateUser = User.omit(["id"]);
const UpdateUser = CreateUser.partial();
const PublicUser = User.pick(["id", "name"]);
const CompleteUser = User.required();
const WithRevision = User.extend({ revision: number({ integer: true }) });
const UserId = User.shape.id;
```

`object()` returns `ObjectSchemaType<Shape, Policy>`. Its `shape` is frozen and
retains each original field schema. Every composition method returns a new frozen
object, preserving its unknown-property policy and `.annotate()` metadata.
`pick` and `omit` take readonly arrays of existing field names; invalid names
throw. `extend` only adds fields; collisions throw even when types match.
`partial` is shallow and does not weaken nested objects. `required` rejects
missing fields and undefined inputs/outputs while preserving field rules.
`PartialShape` and `RequiredShape` describe the resulting field maps.

Apply object-level refinements after composing. A refined object's static type
does not expose shape-changing methods; bypassing the type restriction still
throws at runtime. An arbitrary cross-field callback cannot safely be projected
onto a different shape. Field-level refinements, warnings and async rules remain.

## Validate every stage

```ts
const Page = string({ pattern: "^[0-9]+$" })
  .transform(Number)
  .pipe(number({ integer: true, minimum: 1, maximum: 100 }));

Page.parse("12"); // 12
Page.safeParse("0").success; // false: checked output is outside the range
Page.safeParse(12).success; // false: original input must be a string
```

`first.pipe(next)` accepts compatible intermediate types (or unknown output that
needs narrowing), retains the first input and infers the next output. Each stage
runs only after the previous stage succeeds. Warnings accumulate in execution
order; errors retain full containing-object/array/HTTP paths. Both stages
participate in async detection, including Standard Schema validation. Use
`safeParseAsync` for async pipelines. A pipeline is not an optional property until
explicitly wrapped with `.optional()`.

The output graph contains the checked next-stage structure with an anonymous
refinement. Its declaration can describe the checked type, but that does not
establish exactly which values a callback produces. Exact JSON Schema export
rejects these opaque restrictions; compatibility remains conservative, including
when two pipelines have identical descriptions. Input graph descriptions retain
an opaque transform. No callback is run during introspection or export.

The [connected example](../examples/connected-contracts.mjs) combines object
composition, an explicit HTTP conversion, recursive declarations and a CI check.
