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

The package re-exports:

- `@safe-shape/core`
- `@safe-shape/http`
- `@safe-shape/json-schema`
- `@safe-shape/typescript`
- `@safe-shape/validation`

Installing this package also installs `@safe-shape/cli`, which provides the
`safe-shape` CLI binary.

Use the scoped packages directly when a project wants the narrowest dependency
surface.
