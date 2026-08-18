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

Create and check a v2 contract baseline:

```sh
node packages/cli/dist/cli.js contract snapshot \
  --module examples/user-schema.mjs \
  --export userSchema \
  --id user \
  --format v2 \
  --out ./.tmp/user.contract.json

node packages/cli/dist/cli.js --json contract check \
  --module examples/user-schema.mjs \
  --export userSchema \
  --against ./.tmp/user.contract.json \
  --side input
```

The JSON check result includes a migration decision and actionable diagnostics.

Run the example smoke check:

```sh
npm run examples:check
```
