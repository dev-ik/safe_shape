# ADR 0034: Measure module import once and warm parser samples

## Status

Accepted.

## Evidence and decision

The pre-release harness produced non-reproducing failures across array, tagged,
record imports and short union parses. `scenarios(library, moduleUrl)` imports
the same module and constructs the same complete fixture list before selecting
any scenario. Its import timing is thus one shared operation, not ten distinct
scenario operations. Preserve every raw import sample and gate their combined
50-sample median per library once, instead of applying ten independent gates to
five-sample subsets of the identical operation. Keep per-scenario diagnostics.

Increase parse warmup from 100 to 2,000 and measured iterations from 2,000 to
20,000 before collecting new evidence, identically for candidate, baseline and
reference. This reduces first-tier/JIT and timer effects in very short samples.
Keep five process repetitions, all scenario-specific parse gates, assertions,
baseline tag, heap population and the original 20%/25% budgets unchanged.
No failed historical run is discarded or reclassified automatically.

The updated method requires fresh candidate evidence. It is not permission to
publish if budgets, independent review or final candidate CI remain unresolved.
