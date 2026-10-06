# SafeShape 3.5.0: AI contracts and MCP

**English** | [Русский](ru/release-3.5.0.md)

Status: local candidate; not published. See [qualification evidence](release-evidence-3.5.md).

## Included

- Explicitly installed `@safe-shape/mcp` with six stdio inspection tools:
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
and umbrella do not acquire an MCP SDK dependency. All ten packages use 3.5.0.

The SDK is pinned to 1.32.1; Node >=20.10 and ESM remain required. Imported modules
and their callbacks are trusted JavaScript, not sandboxed. Cancellation cannot
interrupt synchronous work, force async code to settle or undo side effects.
Opaque rules are not silently weakened during export. Application payloads keep
core mutability semantics; report wrappers and diagnostics remain immutable.

Remote HTTP hosting and provider-specific AI profiles are outside this release.
Publication/provenance configuration and remote CI remain separate from local
qualification. No release tag, remote push or npm publication is part of this work.

See [MCP guide](mcp.md), [API reference](api/mcp.md), RFC 0051 and ADR 0039.
