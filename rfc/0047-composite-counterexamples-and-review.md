# RFC 0047: Composite counterexamples and Markdown review

## Status

Accepted.

## Composite domain

Extend the unpublished counterexample value type to recursive JSON arrays and
objects. Support finite trees of existing scalar nodes, objects, arrays, unions,
optional and nullable wrappers. Preserve object unknown-property policies and
required fields. Reconstruct validators using core primitives and validate the
entire root before returning a witness. Never present a property fragment as a
root witness. Recursion/references, transforms, refinements, intersections,
tuples, pattern/format and output synthesis remain unavailable.

Construction limits per direction: depth 4 (root depth zero), 128 schema nodes
per reconstructed root, 16 properties per object, 8 union choices, 16 elements
per generated array, 16 retained candidates per local pool, and 4,096 local
candidate evaluations. Retain the 128 root-validation and 1,024 synthesized
string-length limits. These are search bounds, not compatibility assertions.
Before runtime validation, each composite candidate is also limited to 1,024
expanded value nodes and 65,536 UTF-16 code units across string values and keys.
Count shared subtrees for each occurrence; reject before serialization or
validation when the bound is exceeded. Standalone supplied scalar literals keep
their existing semantics. Noncanonical required/optional combinations in
external object snapshots are unsupported rather than approximated.
Oversized trees return `construction-limit`; unsupported node kinds return
`unsupported-domain`. Candidate pools use source and target hints, construct a
valid source seed, and vary one property/array element at a time. Cartesian
products and exhaustive union coverage are not promised. If construction is
truncated without a witness, report `construction-limit`. All returned value
containers are deeply frozen; prototype-sensitive property names remain own
properties and survive JSON serialization.

## Review output

CLI `contract check` and `contract check-many` gain `--markdown`. The flag emits
a Markdown artifact to stdout, including decisions, paths, directions, original
reasons/suggestions, HTTP roles when provided by the manifest, optional
counterexamples, and operational errors in batches. Use `--counterexamples` to
include bounded witnesses. Opaque relationships stay manual-review, and missing
witnesses never become a compatibility decision.

`--markdown` is incompatible with `--json` and `--out` and valid only for the two
check commands. Reject invalid combinations before loading schema modules.
Shell redirection stores the artifact; no publication, comments or baseline
writes are performed. Default JSON/text envelopes and exit codes are unchanged.
Escape user-controlled Markdown/HTML and use JSON code blocks with safe fences.
The renderer lives in CLI and does not add presentation dependencies to core.

## Evidence

Test complete runtime witnesses for required additions, nested constraints,
enum removals, array lengths/items, union removals, both directions/formats,
optional absence, property policies and prototype-sensitive keys. Include
limits and unsupported nodes. Test Markdown mixed decisions and errors,
escaping, flag validation, unchanged baselines and installed consumers.
Before measuring, set a composite fixture budget of 1,000 searches in 5 seconds.
