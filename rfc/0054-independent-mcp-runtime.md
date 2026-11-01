# RFC 0054: Independent MCP runtime and dependency removal

## Status

Accepted

The user requires removing Zod from the entire project, including transitives,
development dependencies, benchmarks and migration execution tests. The official
MCP SDK depends on Zod; retaining it as a peer or development dependency would
not satisfy this requirement.

Replace the SDK with a SafeShape-validated JSON-RPC server for the existing six
inspection tools. Keep createSafeShapeMcpServer, connect(transport), close(), the
CLI, validated handler envelopes, byte/depth/concurrency limits and cooperative
deadlines. Expose package-owned SafeShapeMcpServer, McpTransport,
McpJsonRpcMessage and McpCallToolResult types. Support the explicit MCP 2025-06-18
baseline, initialize/initialized, ping, tools/list, tools/call and cancellation.
Reject unsupported requests with method-not-found; advertise tools only.

This removes the previously promised SDK Server return type and its unrelated
extension methods. Release 4.0.0 rather than describing this as a compatible minor.
Existing SafeShape schema APIs and snapshot formats remain stable. Applications
using only connect/close retain their usage; SDK-specific extensions must be
owned by the application or adapted to the new transport interface. SDK Client
libraries can still communicate over MCP; SafeShape does not install them.

Validate envelopes and method arguments using SafeShape without executing getters.
Bound frames before parsing; preserve lossless JSON checks. Negotiate the baseline,
require initialization before tools, ignore unknown/malformed notifications, and
never reply to notifications. Cancellation/close abort pending requests and suppress
late replies; a running callback continues to hold its existing execution slot.
Bound output buffering, handle write errors, remove stream listeners on close and
make close idempotent. No retries, filesystem access or business handlers are added.

Remove the competitor benchmark branch and keep candidate versus previous SafeShape
measurements. Migration tools parse source text without importing the old library;
their tests use explicit expected acceptance/output tables. Add dependency checks
for published installations and lockfiles so Zod cannot return transitively.

Verify lifecycle, malformed requests, cancellation, overload, duplicate active IDs,
shutdown, stdio framing/backpressure, installed consumers, strong declarations,
and all release gates. Historical benchmark records remain historical evidence.
