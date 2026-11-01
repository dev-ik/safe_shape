# @safe-shape/mcp

**English** | [Русский](https://github.com/dev-ik/safe_shape/blob/v4.0.0/packages/mcp/README.ru.md)

Runtime contracts for AI tools and a local MCP inspection server. Node >=20.10, ESM.
Install this package independently for a narrower setup, or install `safe-shape`
and import these APIs from `safe-shape/mcp`. The server validates MCP with SafeShape and has no Zod or MCP SDK dependency.
The umbrella main entry does not load MCP. See the
[4.0 migration guide](https://github.com/dev-ik/safe_shape/blob/v4.0.0/docs/migration-3-to-4.md).

```sh
npm install @safe-shape/mcp @safe-shape/core
npx --no-install safe-shape-mcp --help
```

Create your schema module and `safe-shape.mcp.json` using the guide below, then run:

```sh
npx --no-install safe-shape-mcp --workspace . --manifest safe-shape.mcp.json
```

The manifest belongs to your project; npm installation does not create example files.

Export SafeShape input/output contracts, validate tool boundaries and inspect
registered contracts over stdio. Invalid arguments never reach the handler;
invalid results never become successful responses. Trusted schema modules run
with process permissions; path checks are not a JavaScript sandbox. Deadlines
are cooperative. No automatic retries or baseline writes.

[Guide](https://github.com/dev-ik/safe_shape/blob/v4.0.0/docs/mcp.md) · [API](https://github.com/dev-ik/safe_shape/blob/v4.0.0/docs/api/mcp.md)
