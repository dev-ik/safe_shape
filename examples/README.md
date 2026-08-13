# Examples

Runnable examples for the built SafeShape CLI.

Consumer projects can install the full SafeShape package:

```sh
npm install safe-shape
```

Then import only what they use:

```ts
import { object, string, validateSchema } from "safe-shape";
```

Build the packages first:

```sh
npm run build
```

Export JSON Schema:

```sh
node packages/cli/dist/cli.js --json schema export \
  --module examples/user-schema.mjs \
  --export userSchema \
  --schema https://json-schema.org/draft/2020-12/schema
```

Validate JSON:

```sh
node packages/cli/dist/cli.js --json schema validate \
  --module examples/user-schema.mjs \
  --export userSchema \
  --input examples/valid-user.json
```

Generate TypeScript:

```sh
node packages/cli/dist/cli.js --json schema types \
  --module examples/user-schema.mjs \
  --export userSchema \
  --name User
```

Run the example smoke check:

```sh
npm run examples:check
```
