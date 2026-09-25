# Isolated Release Quality Fixtures

These pinned dependencies are private test tooling and do not enter published
SafeShape packages. Install with `npm ci --prefix quality`, build the workspace,
then run `npm run quality:check` from the repository root.

The fixed comparison matrix covers ASCII string constraints, strict nested
objects, optional/nullable members, arrays, tagged and ordinary unions, records,
finite recursive values, output transforms, and resolved asynchronous rules.
Valid and invalid acceptance and successful outputs are asserted independently.
Library-specific diagnostic formats are not required to match. SafeShape
warnings, graph comparison, and snapshots are tested separately; Zod is not the
semantic authority for them. Ordinary Zod is used, not Mini or compiled parsing.

Before measuring: five isolated processes per library/scenario, alternating
order; 2,000 warmup and 20,000 validated measured parses; 10,000 retained schemas
for heap sampling. Measures include validation assertions and async harness
overhead in both libraries. This is paired workload evidence, not pure parser
nanosecond timing. Raw samples, spread, and source identity are retained.

The new batch workflow budget is 5 seconds for 50 recursive checks sharing a schema module and baseline on this
local reference machine, excluding installation and build. It is a coarse CI
usability budget, declared before measurement; no universal machine SLA is
claimed. Matched baseline regression budgets follow the quality contract.
Cold construction and short compiler timings may be noisy; rerun inconclusive
cases instead of presenting them as proven regressions.

`form.mjs` exercises the actual React Hook Form Standard Schema resolver in a
browser-targeted bundle. A VM executes the bundled logic without Node globals;
this does not replace a real browser UI or independent developer walkthrough.
External resolvers may ignore SafeShape's optional warnings channel; the fixture
checks both the resolver result and native diagnostics explicitly.


The full release gate includes this harness. CI installs the private lockfile,
fetches the `v3.1.0` baseline tag, and runs Node 20.10.0/24 jobs with report
artifacts. Budget misses or inconclusive ratios for changed artifacts exit 2;
functional failures exit 1. Independent walkthrough and remote candidate CI
remain separate gates, explicitly listed in the JSON report. The generated
`.tmp/quality/browser/` fixture can be served locally for a real browser check;
its bundle hash is included in the report to tie manual browser evidence to the
exact asset. Source-identified reports capture the working tree at execution,
not edits made later to summarize the run.
Cold import is measured before selecting a scenario. Its 50 raw samples per
library are therefore gated as one shared module-import operation, with the
same 20% budget. Per-scenario import summaries remain diagnostic. See
[ADR 0034](../adr/0034-release-performance-measurement.md); historical failures
remain recorded and the updated method requires fresh candidate checks.

Next-release qualification retains existing budgets against published 3.1.0.
New composition and checked-pipeline scenarios compare SafeShape with pinned
Zod in five alternating isolated samples; each 20,000-parse valid/invalid
workload has a predeclared 5-second median budget. Reports retain per-call
measurements and all samples. The benchmark runner separately budgets 1,000
connection checks and 10,000 checked pipeline parses at 5 seconds each. These
are fixture budgets, not cross-machine performance claims. Form and installed CI
fixtures now exercise composition, pipelines and producer/consumer connections.

Invalid-input measurements now include three separate operations: acceptance
only (`invalidMs`), recursive issue/path/message consumption (`issuesMs`), and
native formatting (`formattedMs`: SafeShape formatValidationError, Zod error
message). Every mode includes parsing; formatting is intentionally vendor-specific
and is not an equal-output comparison. Nothing is deferred out of the measured
operation. Both added metrics use the same predeclared 20% regression budget
against 3.1 and 5-second feature-workload budget as existing parse metrics.
