# RFC 0052: one-install MCP entry

## Status

Accepted

The user approved including MCP in `safe-shape` before publishing 3.5.0.

## Public capability

Add the Node ESM `safe-shape/mcp` subpath, re-exporting the public API and types
of `@safe-shape/mcp`. The umbrella declares an exact-version dependency on that
package; `npm install safe-shape` installs MCP and its SDK transitively. The
dedicated package remains installable for narrower dependency selection.

The main `safe-shape` entry does not re-export or import MCP. Existing runtime
exports and import graphs stay compatible. Node >=20.10 remains the floor.
An ESM loader regression rejects any MCP/SDK resolution during ordinary root
import. An isolated installed consumer installs only the umbrella archive and
verifies the MCP subpath and executable using local scoped-package metadata.

The installation footprint increases; the core package retains no MCP/SDK
dependency. Contract semantics, trusted modules and cancellation are unchanged.
