# SafeShape and MCP

**English** | [Русский](ru/mcp.md)

Install the explicitly separate `@safe-shape/mcp` package alongside SafeShape.
The local inspection server and validated application-tool adapter ship together.
Node >=20.10 and ESM are required. The umbrella and core do not depend on MCP.

```sh
npm install @safe-shape/mcp @safe-shape/core
npx --no-install safe-shape-mcp --workspace . --manifest examples/mcp.manifest.json
```

The executable uses stdio. Configure your coding agent to launch that command
with an absolute workspace path. Tool arguments contain contract IDs and JSON;
they never select JavaScript modules or output files.

For Codex, the configuration uses an explicit executable path:

```toml
[mcp_servers.safe_shape]
command = "node"
args = ["/absolute/project/node_modules/@safe-shape/mcp/dist/cli.js", "--workspace", "/absolute/project", "--manifest", "examples/mcp.manifest.json"]
```

Replace the absolute project path. This configuration can also be supplied per
CLI invocation; the acceptance walkthrough uses temporary overrides without
changing global settings.

## Register contracts

Create a trusted ESM module exporting SafeShape schemas. Supply a JSON manifest:

```json
{
  "version": 1,
  "contracts": [
    { "id": "user", "description": "User arguments", "module": "schema.mjs", "export": "userSchema" }
  ],
  "tools": [
    { "id": "user-tool", "name": "inspect_user", "description": "Inspect a user", "inputId": "user", "outputId": "user" }
  ]
}
```

`module` paths resolve from the workspace root, including when the manifest is
in a subdirectory. `export` defaults to `default`. Real paths, including symlink
targets, must remain inside the workspace. Every configured path and catalog
reference is checked before module imports. Imported modules and callbacks run
with process permissions; this is not a sandbox for untrusted code or transitive
imports. Review schemas before registering them.

## Agent tools

| Tool | Use |
| --- | --- |
| `list_contracts` | Discover IDs/descriptions; default page 20, maximum 100 |
| `describe_contract` | Input/output Contract IR graphs and export support |
| `export_json_schema` | Exact export, default input/Draft 2020-12; Draft 7 also supported |
| `validate_data` | Check inline JSON and obtain parsed output or native issues |
| `compare_contracts` | Compare registered versions; default backward/input |
| `export_tool_definition` | Export an explicitly cataloged MCP tool |

Inspection returns `{ok, operation, result}` or `{ok:false, operation, error}`
in structured content and equivalent JSON text. Invalid data and incompatible
contracts are completed reports, not operational errors. Check `result.valid`
and migration decisions, including manual review. Unknown IDs and unsupported
exports set `isError:true`. Malformed tool arguments are protocol errors.
No inspection operation updates a baseline or runs application business handlers.

## Application tools

```js
import { object, string, number } from '@safe-shape/core';
import { defineMcpTool, safeToMcpToolDefinition, createValidatedMcpHandler } from '@safe-shape/mcp';

const tool = defineMcpTool({
  name: 'text_length', description: 'Measure text length',
  input: object({ text: string() }), output: object({ length: number() })
});
const exported = safeToMcpToolDefinition(tool);
if (!exported.success) throw new Error('Tool is not exactly exportable');
const handle = createValidatedMcpHandler(tool, ({ text }) => ({ length: text.length }));
const result = await handle({ text: 'hello' });
```

Register the exported definition and handler with your application's MCP server.
The inspection server does not register that handler for you. Invalid arguments
block execution; invalid output blocks success. No retry is implicit. Async rules
and transformations preserve input/output type inference. Runtime validation is
still required after exact export. Opaque refinements/outputs fail export rather
than silently weakening the schema. Baseline tool definitions and successful
structured results require object roots.

Successful handlers return validated structured content plus JSON text.
Warnings are separate in `_meta['safe-shape/warnings']` with `input`/`output`
arrays. Execution errors use diagnostic text and `isError:true`, without an error
object contradicting the success output schema. Raw exception messages and stack
traces are not returned. Native diagnostics can contain sensitive authored data;
return them only to authorized clients. Serialization rejects cycles, bigint,
undefined, non-finite numbers, getters, custom classes and sparse arrays.

## Limits and cancellation

Optional manifest `limits` keys: `requestBytes` (1048576), `depth` (128),
`responseBytes` (4194304), `concurrency` (16), `deadlineMs` (30000).
Values are positive safe integers; deadlines must fit the Node timer range.
Responses are not truncated. A response budget too small for diagnostics closes
the transport. Stdio framing checks bytes/depth before SDK JSON parsing.

Cancellation/deadlines are cooperative and cannot terminate synchronous code,
force custom async rules to settle or roll back side effects. Capacity stays
occupied until running callbacks settle. Handlers receive an AbortSignal.

## Verification

Run `node examples/mcp-tool-boundary.mjs` and `node examples/mcp-workflow.mjs`.
The second is an official SDK-client stdio smoke test, not a real-agent test.
The interoperability baseline is MCP 2025-06-18; SDK-supported revisions and
actual tested clients are recorded separately in release evidence.

See the [API reference](api/mcp.md) and [release workflow](release.md).
