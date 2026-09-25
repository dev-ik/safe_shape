# SafeShape 3.2.0 production and diagnostics qualification

This run predates the final CLI packaging correction. See the
[additional readiness verification](release-readiness-3.2.0.md) for that fix,
Node 24 and fresh-project/browser checks. The
[publication record](release-candidate-3.2.0.md#verified-publication) contains
the final published archive hashes.

Final command: `npm --fetch-retries=0 run prepare:release`, exit **0**.
Log: `/tmp/safe-shape-polish-release.log`. This run supersedes the
[initial candidate evidence](release-evidence-3.2.0.md) for the artifacts tested
at this stage; it predates the final CLI archive metadata fix.

## Changes and correctness

- Private traversal carries diagnostics; a failed public parse constructs one native ValidationError. Public Error identity, message, stack and immutable diagnostic containers are retained.
- Public core declaration files are byte-identical to the candidate before this polish.
- Connection terminal reports show paths, reasons, suggestions and confirmed producer input/output witnesses or explicit unavailability.
- Production examples reject invalid operations, isolate service/runtime failures and log through an application-owned sink. Sync throws, rejected promises and pending loggers cannot change the operation result.
- The HTTP recovery example now consumes rejected reporter promises and isolates accidental asynchronous fallbacks in its synchronous callback contract.
- Expanded tests cover composition/undefined combinations, async short-circuiting, concurrent/reentrant diagnostics, nested union warnings and a 26-schema production/consumer matrix with independently executed witnesses.

## Verification

- 274 package tests passed: core 91, compat 72, CLI 44, HTTP 18, JSON Schema 24, TypeScript 12, validation 12, umbrella 1.
- Two benchmark-runner tests, three migration tests and three production example tests passed. Production tests also ran against installed tarballs with `--unhandled-rejections=strict`.
- Build, typecheck, package metadata, documentation, examples, benchmark budgets and installed consumers passed.
- Form/resolver, server, contract-connection and production quality fixtures passed.
- No quality budget regressions, inconclusive outcomes or noise exemptions.
- Both dependency audits reported zero known vulnerabilities.
- Eight final archives match the SHA-256 hashes of the tarballs used by installed quality consumers.
- `cli:doctor` reports 3.2.0. No dependencies or package versions were changed by this polish.

## Direct before/after diagnostic comparison

Five alternating isolated processes per version/workload; 2,000 warmup and
20,000 measured operations per mode. Both builds are the local 3.2 candidate:
the before build precedes boundary error materialization. Error.stackTraceLimit
was not changed. Each diagnostic mode includes parsing and actual consumption.
Raw samples: `.tmp/diagnostic-polish.json`; saved before build:
`.tmp/core-before-polish/`; local runner: `.tmp/measure-polish.mjs`.

Before core JS hash: `591f782fda5c21ef8b78c325f8b8eb598c5a5401fe517538b110e5a714261d3a`.
After core JS hash: `ebfbb29d20f6cc670518266cf5347981f23d5c5a1fbb7467cbc3182c60c571cc`.

Median microseconds per workload operation:

| Workload | Consumption | Before | After | Speedup |
| --- | --- | ---: | ---: | ---: |
| nested | acceptance | 18.341 | 5.406 | 3.39× |
| nested | recursive issues | 18.598 | 5.366 | 3.47× |
| nested | formatted error | 18.893 | 5.614 | 3.37× |
| recursive | acceptance | 25.819 | 6.067 | 4.26× |
| recursive | recursive issues | 25.571 | 5.854 | 4.37× |
| recursive | formatted error | 25.892 | 6.316 | 4.10× |
| union | acceptance | 17.190 | 6.721 | 2.56× |
| union | recursive issues | 17.006 | 6.954 | 2.45× |
| union | formatted error | 18.618 | 8.291 | 2.25× |

## Final paired release workloads

Generated: 2026-09-25T09:30:05.776Z; v20.10.0, darwin arm64, Apple M4 Pro.
Pinned Zod: 4.6.1. Baseline: v3.1.0 (`13e0f8ac382a7baf8686fd0992a701736c9a3760`).
Measured source patch SHA-256: `6dc0dfa4df9c2c0e9ca1bb205109d9978f065023bf7793362ffd842d092e7dbe`.

Five alternating isolated samples, 2,000 warmup and 20,000 measured parses per
mode. Assertions and async harness overhead are included. These are fixture
measurements, not pure parser timings or a universal library ranking.

| Workload | Safe valid µs | Zod valid µs | Safe invalid µs | Zod invalid µs |
| --- | ---: | ---: | ---: | ---: |
| constraint | 0.452 | 0.255 | 5.360 | 0.670 |
| nested | 1.858 | 0.720 | 5.867 | 0.989 |
| optional-nullable | 1.148 | 0.393 | 5.639 | 0.711 |
| array | 0.945 | 0.396 | 5.686 | 0.948 |
| tagged | 1.644 | 0.507 | 6.548 | 0.808 |
| union | 0.488 | 0.275 | 6.881 | 1.224 |
| record | 0.832 | 0.520 | 4.727 | 1.148 |
| recursive | 2.784 | 1.213 | 6.144 | 1.655 |
| transform | 0.454 | 0.273 | 4.665 | 0.640 |
| async | 0.556 | 0.448 | 2.237 | 1.302 |
| composition | 1.361 | 0.460 | 5.075 | 0.662 |
| pipeline | 0.589 | 0.276 | 4.677 | 0.539 |

Zod remains faster in these acceptance-only parse workloads. Passing the
unchanged regression budgets does not establish speed parity. Added `issuesMs`
consumes recursive issues, messages and paths; `formattedMs` runs native
formatting (SafeShape formatValidationError, Zod error.message). Formatting
outputs differ by design. Both modes include parsing and are recorded/gated
separately in `.tmp/quality/report.json`.

The selected two-string-field strict-object consumer bundle measures:

| Library | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| safe | 47800 | 10523 |
| baseline | 44062 | 9654 |
| zod | 84057 | 24703 |

This is one consumer fixture, not the full library or every import pattern.

## Current artifacts

Archives are in `release-artifacts/`. Verification:
`.tmp/release-3.2.0-archives.json`. Reports and archives are local ignored files.

- `safe-shape-3.2.0.tgz`: `6e9f5195fa3f57f444a9acf6efdccf557ec4844859a3be77d98bcf0910c8a3a1`
- `safe-shape-cli-3.2.0.tgz`: `58238f31fd7bfc427db4060f7658e0e4743adf89142c4d1751654ffcd3dd8c74`
- `safe-shape-compat-3.2.0.tgz`: `501b8aed4d9892d036fc9e826f866ca619c832c72e451b000c8b384691beb28a`
- `safe-shape-core-3.2.0.tgz`: `4d5eb27317c6ea967270834ad229675bc27732e9b5859b62c3ace448f7b4f301`
- `safe-shape-http-3.2.0.tgz`: `cbbeedc0710c1b510cb1af1c4fa590da105f473121063d96046a283ab635cb90`
- `safe-shape-json-schema-3.2.0.tgz`: `d4139fb69a00974448adc46794dd018b179552ff4bbb675338d512a2d20b350c`
- `safe-shape-typescript-3.2.0.tgz`: `367ea408b5ec6cb75fa89e301402f4a4424d508a6bbbde04451ddf7e71da012e`
- `safe-shape-validation-3.2.0.tgz`: `545cde08c523c019813a0df3cbe8d2a8dcbfd7b595dfdefba0c901ae0b41bc57`

## Scope and remaining qualification

Production handling is an application example using existing APIs, not a global
catch-all mode in core. `parse` still throws; `safeParse` returns validation
failures, while application code handles unexpected JavaScript exceptions.
Logging is best effort: unavailable telemetry does not become a new failure.
Invalid values never become trusted data. See
[production boundaries](production-boundaries.md) and
[ADR 0036](../adr/0036-boundary-error-materialization.md).

Configured CI for a final committed candidate and an independent developer
walkthrough remain pending. Automated tests do not prove immunity from process
termination or failures outside the handler. No commit, tag, push or publication
was performed. This evidence and candidate documentation were finalized after
measurement; they are outside the recorded source patch hash. No packaged code
changed after the successful gate.
