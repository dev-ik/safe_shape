# SafeShape 3.5.1: documentation corrections

**English** | [Русский](ru/release-3.5.1.md)

This patch delivers corrected documentation through all ten npm packages.
Publication status is recorded in the [GitHub release](https://github.com/dev-ik/safe_shape/releases/tag/v3.5.1)
and [release evidence](release-evidence-3.5.1.md).

## Changes

- Current README/navigation/roadmap refer to the current release; older features
  and development checkpoints are explicitly part of the release history.
- Local CLI examples use `npx --no-install`; npm scripts still use `safe-shape`.
- The MCP guide creates a schema and manifest before launching the server.
  Repository examples are distinguished from files supplied by npm.
- Russian guides use available Russian references; the broken umbrella API link is fixed.
- Packaged EN/RU READMEs and their links are pinned to `v3.5.1`.
- The publication checklist covers every current status page and npm verification.

No public API, schema validation or MCP handler semantics changed. Runtime
version metadata and exact internal dependencies move together to 3.5.1.
Node >=20.10 and ESM are still required. One `npm install safe-shape` provides
`safe-shape/mcp` and the MCP executable.

```sh
npm install safe-shape@3.5.1
```

No migration is required. All ten packages now have configured trusted publishers.
