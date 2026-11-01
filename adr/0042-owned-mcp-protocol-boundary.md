# ADR 0042: Own the bounded MCP inspection protocol

## Status

Accepted

Supersede ADR 0039's SDK dependency while retaining its manifest trust boundary,
inspection-only capabilities and runtime limits. The required removal of Zod
precludes both production and development use of the official MCP SDK.

Use core schemas for request envelopes and params, Node streams for newline-delimited
stdio, and package-owned structural protocol types. Keep protocol dispatch separate
from the existing inspection operations and ExecutionGate. Applications remain
responsible for authenticating any custom network transport; no HTTP server is added.

Expose a narrow server/transport interface rather than reproducing the full SDK.
Record the breaking SDK return-type removal in RFC 0054 and the 4.0 migration guide.
Independent wire fixtures assert literal protocol responses; installed consumers
must contain neither Zod nor the SDK, and the same rule applies to quality fixtures.
