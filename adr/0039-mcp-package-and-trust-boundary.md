# ADR 0039: MCP package and trusted registry

## Status

Accepted

Add `mcp -> core/validation/json-schema/compat` plus the official MCP SDK.
Keep core and the umbrella independent of the SDK. Reuse domain libraries
instead of subprocess CLI execution. Low-level SDK protocol handlers allow
SafeShape to remain the public contract interface.

The fixed operator registry permits only ID-based inspection calls. Canonical
entry module paths must stay inside the configured workspace; imported modules
and their transitive imports/callbacks still execute with process permissions.
This is a trust boundary for selection, not a JavaScript sandbox. The inspection
server never calls application business handlers. Stdio is the only initial
transport; remote tenancy/authentication needs a separate design.

Validate arguments and outputs at explicit application boundaries. Preserve
capacity until callbacks settle after cooperative cancellation/deadlines.
Bound wire frames and full results; never truncate artifacts or expose raw
exception messages. Do not infer application side-effect annotations.

The separate-install requirement is superseded by ADR 0040: umbrella installs
MCP transitively and exposes it through an opt-in subpath; its root import and
core remain unchanged. The trust boundary above still applies.
