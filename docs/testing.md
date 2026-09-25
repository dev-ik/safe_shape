# Testing

Unit, integration, type, regression and fuzz tests.

## Release quality

Build first, install the isolated pinned tooling with
`npm ci --prefix quality --ignore-scripts`, then run `npm run quality:check`.
The release gate also runs this command; CI installs the tooling explicitly.
Reports are written to `.tmp/quality/report.json` and include exact dependency
versions, source/patch identity, raw performance samples, and pending external
checks. The current matched baseline requires the local `v3.1.0` tag.

`packages/compat/tests/generated.test.ts` uses fixed seed `0x5afe31`, 42 schemas
from a bounded nested grammar, and 119 values. It challenges safe proofs in all
three modes and both graph sides, and checks v1/v2 input status agreement.
Outputs are checked separately for this identity-producing grammar; transforms
and object policies have dedicated cases. The minimized equal-literal regression
is retained independently of the generator. See RFC 0043.

`packages/core/tests/inference.types.ts` supplies positive/negative compile-only
assertions under strict mode and exact optional property types. Quality fixtures
also consume installed declarations with TypeScript 5.9.2 and 7.0.2; this records
tested versions, not an untested claim about every intervening compiler.

The browser-targeted form bundle executes a real Standard Schema resolver in a
VM without Node globals. This verifies resolver behavior and bundle composition;
real browser interaction and the [independent walkthrough](../quality/WALKTHROUGH.md)
remain separate evidence.
