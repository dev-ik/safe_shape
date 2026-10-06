# SafeShape 3.5.0: AI contracts and MCP

**English** | [Русский](ru/release-3.5.0.md)

Status: published on npm on 2026-10-06; all ten packages have `latest=3.5.0`.
See the [GitHub release](https://github.com/dev-ik/safe_shape/releases/tag/v3.5.0)
and [verified publication evidence](release-evidence-3.5.md).

## Included

- `safe-shape/mcp` included by one umbrella install, plus independently available `@safe-shape/mcp` with six stdio inspection tools:
  discovery, descriptions, exact JSON Schema export, validation, directional
  compatibility and MCP tool-definition export.
- Typed application tools with argument validation before execution and result
  validation before success; async rules, transformations and separate warnings.
- Fixed developer-configured registry/manifest. ID-based calls cannot select
  module paths, write files, update baselines or execute business handlers.
- Bounded frames/results/concurrency and cooperative cancellation/deadlines.
- Exact recursive object-root MCP exports with explicit unsupported diagnostics.
- English/Russian guides, packaged READMEs, runnable examples and installed
  tarball checks. All ten archives receive a SHA256SUMS manifest.

## Compatibility and limitations

This is a backward-compatible minor release. Existing schemas, CLI envelopes,
snapshot formats, umbrella and browser import graphs remain compatible. Core
remains SDK-independent. Umbrella installs MCP/SDK transitively but its main
entry does not load them; use the explicit MCP subpath. All ten packages use 3.5.0.

The SDK is pinned to 1.32.1; Node >=20.10 and ESM remain required. Imported modules
and their callbacks are trusted JavaScript, not sandboxed. Cancellation cannot
interrupt synchronous work, force async code to settle or undo side effects.
Opaque rules are not silently weakened during export. Application payloads keep
core mutability semantics; report wrappers and diagnostics remain immutable.

Remote HTTP hosting and provider-specific AI profiles are outside this release.
CI passed on Node 20.10 and 24, and all ten packages are published on npm.
Nine packages were published through OIDC with provenance. The first MCP
publication used the maintainer's CLI without provenance; its trusted publisher
is configured for future releases. See the linked publication evidence.

See [MCP guide](mcp.md), [API reference](api/mcp.md), RFC 0051 and ADR 0039.
