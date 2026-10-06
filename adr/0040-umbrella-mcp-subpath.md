# ADR 0040: opt-in MCP loading through the umbrella

## Status

Accepted

Replace the separate-install requirement in ADR 0039 with a regular exact-version
`safe-shape -> mcp` dependency and an explicit `safe-shape/mcp` entry. This follows
the umbrella's existing install convenience while keeping `@safe-shape/mcp`
available independently.

Only the MCP subpath imports the SDK-bearing package. Do not add a root re-export,
conditional installation, optional dependency or hidden dynamic fallback.
Core remains independent; root imports preserve their existing module graph.
The trade-off is a larger installation for every umbrella consumer, even when
they do not load MCP. Verify actual umbrella-only installation and executable
availability, not just imports in a workspace that already installed all scopes.
