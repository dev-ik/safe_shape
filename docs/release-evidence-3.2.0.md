# SafeShape 3.2.0 initial local qualification evidence

Historical run before production/diagnostics polish. See the
[current qualification](release-polish-3.2.0.md) for the rebuilt candidate.

Final command: `npm --fetch-retries=0 run prepare:release`, exit **0**.
Log: `/tmp/safe-shape-320-candidate.log`. Registry access was available for audits.

- 268 package tests and two benchmark runner tests passed.
- Three source-migration tests passed, including differential runtime and compiler
  consumers, unsupported semantics, no execution and no overwrites.
- Build, typecheck, metadata, documentation and runnable examples passed.
- All eight tarballs installed into independent consumer projects successfully.
- Quality form/resolver, HTTP and connection-CI journeys passed.
- Both dependency audits reported zero known vulnerabilities.
- Quality reported zero budget regressions, inconclusive results or noise exemptions.
- Package dry runs and archive creation passed. All eight final archive SHA-256
  hashes match the tarballs used by the installed quality consumers.
- `cli:doctor` reports 3.2.0. Versions and the root lockfile are synchronized.

The versioned run supersedes the initial development run that stopped at sandbox
DNS failure during audit. That earlier run is not described as a passing combined
command; its report is retained at `.tmp/quality-next-first.json`.

## Reproducibility

Environment: v20.10.0, darwin arm64, Apple M4 Pro.
Generated at 2026-09-25T08:40:06.869Z. Pinned Zod: 4.6.1.
Baseline tag: `v3.1.0` (`13e0f8ac382a7baf8686fd0992a701736c9a3760`).
Measured source patch SHA-256: `fd630824f193e2e89d00da72adc4af5b487945fed11fbc8d52a4528b6f2f3c4e`.

The quality harness records five isolated, alternating process samples per
library/scenario, 2,000 warmup and 20,000 measured parses for each valid/invalid
case. Measurements include output assertions and harness overhead; diagnostic
formats are intentionally library-specific. These are workload measurements,
not pure parser timings or a universal ranking. Raw samples, compiler diagnostics,
heap/import measurements and budgets are in `.tmp/quality-before-polish.json`.
New APIs compare against Zod separately because 3.1 has no corresponding API.

## Shared workload comparison

Median microseconds per operation; lower is faster. Zod was faster in all listed
parse workloads. Passing SafeShape's own budgets does not establish Zod speed parity.

| Scenario | SafeShape valid | Zod valid | SafeShape invalid | Zod invalid |
| --- | ---: | ---: | ---: | ---: |
| constraint | 0.336 | 0.225 | 5.248 | 0.620 |
| nested | 1.805 | 0.596 | 18.902 | 0.850 |
| optional-nullable | 1.163 | 0.367 | 12.414 | 0.661 |
| array | 0.805 | 0.367 | 11.215 | 0.858 |
| tagged | 1.421 | 0.475 | 13.254 | 0.697 |
| union | 0.473 | 0.247 | 17.183 | 1.108 |
| record | 0.796 | 0.487 | 10.831 | 1.002 |
| recursive | 2.800 | 1.227 | 26.255 | 1.627 |
| transform | 0.415 | 0.261 | 5.514 | 0.513 |
| async | 0.477 | 0.410 | 2.631 | 1.111 |
| composition | 1.355 | 0.461 | 11.531 | 0.634 |
| pipeline | 0.588 | 0.277 | 6.180 | 0.590 |

The separate production bundle fixture imports a strict object with two string
fields and exports safeParse. It measures this consumer bundle, not every import
pattern or the full ecosystem:

| Library | Minified bytes | Gzip bytes |
| --- | ---: | ---: |
| safe | 47651 | 10484 |
| baseline | 44062 | 9654 |
| zod | 84057 | 24703 |

The candidate gzip bundle grows about 8.6% over 3.1, within the unchanged 20%
budget. Runtime/heap/compiler budgets also passed. Contract connection checks and
checked-pipeline benchmark workloads passed their predeclared operation budgets;
raw outcomes/times are in `.tmp/benchmarks/report.json`.

## Diagnostic cost investigation

`failure()` constructs a native `ValidationError` at each failed layer. A controlled
follow-up used five alternating isolated processes for 20,000 nested invalid parses,
asserting their diagnostic path each time. Changing only the diagnostic process's
Error.stackTraceLimit from 10 to 0 measured these median workload durations:

- Default stack capture: 329.573 ms.
- Diagnostic experiment without stack capture: 57.960 ms.

This identifies stack capture as a substantial contributor; it does not explain
all cost or measure a shipping optimization. No production setting or error
semantics were changed. Raw samples: `.tmp/diagnostic-cost-next.json`. A future
optimization should evaluate internal issue accumulation before constructing the
public error, preserving paths, warnings, ordering and public Error behavior.

## Final artifacts

- `safe-shape-3.2.0.tgz`: `6e9f5195fa3f57f444a9acf6efdccf557ec4844859a3be77d98bcf0910c8a3a1`
- `safe-shape-cli-3.2.0.tgz`: `a1a32a2fe6e553a756c238fb29706b12453a52de1b7f072d6ae2bf1b58014f54`
- `safe-shape-compat-3.2.0.tgz`: `501b8aed4d9892d036fc9e826f866ca619c832c72e451b000c8b384691beb28a`
- `safe-shape-core-3.2.0.tgz`: `58ef9fd1bbd60d6461627e001d804007438a8fa698055904fab5318bd7a6f582`
- `safe-shape-http-3.2.0.tgz`: `cbbeedc0710c1b510cb1af1c4fa590da105f473121063d96046a283ab635cb90`
- `safe-shape-json-schema-3.2.0.tgz`: `d4139fb69a00974448adc46794dd018b179552ff4bbb675338d512a2d20b350c`
- `safe-shape-typescript-3.2.0.tgz`: `367ea408b5ec6cb75fa89e301402f4a4424d508a6bbbde04451ddf7e71da012e`
- `safe-shape-validation-3.2.0.tgz`: `545cde08c523c019813a0df3cbe8d2a8dcbfd7b595dfdefba0c901ae0b41bc57`

These initial archives have since been rebuilt in `release-artifacts/`; the
current manifest is `.tmp/release-3.2.0-archives.json`. The hashes above describe
only this historical run, not the current core/CLI artifacts. Generated reports and archives are local ignored
artifacts. This evidence document and the candidate status were finalized after
measurement and are not included in the measured patch hash. No packaged code
changed afterward.

## Remaining stable-release qualification

Configured CI for a final committed candidate and an independent developer
walkthrough have not been run in this task. VM/form fixtures are not a human UI
walkthrough or production adoption evidence. No commit, tag, push or publication
was performed. These limitations do not change the passing local command result.
