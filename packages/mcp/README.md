# @safe-shape/mcp

**English** | [Русский](https://github.com/dev-ik/safe_shape/blob/v3.5.0/packages/mcp/README.ru.md)

Runtime contracts for AI tools and a local MCP inspection server. Node >=20.10, ESM.
Install this package independently for a narrower setup, or install `safe-shape`
and import these APIs from `safe-shape/mcp`. Core remains SDK-independent; the
umbrella installs MCP/SDK transitively without loading them through its main entry.

```sh
npm install @safe-shape/mcp @safe-shape/core
npx --no-install safe-shape-mcp --workspace . --manifest examples/mcp.manifest.json
```

Export SafeShape input/output contracts, validate tool boundaries and inspect
registered contracts over stdio. Invalid arguments never reach the handler;
invalid results never become successful responses. Trusted schema modules run
with process permissions; path checks are not a JavaScript sandbox. Deadlines
are cooperative. No automatic retries or baseline writes.

[Guide](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/mcp.md) · [API](https://github.com/dev-ik/safe_shape/blob/v3.5.0/docs/api/mcp.md)
