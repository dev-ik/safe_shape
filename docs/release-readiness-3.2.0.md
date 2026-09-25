# SafeShape 3.2.0 final readiness verification

This supplements the [production/diagnostic qualification](release-polish-3.2.0.md).
The implementation is prepared as an isolated candidate for final Linux CI.
Publication and the independent human walkthrough remain separate steps.

## Additional checks

- A fresh Node 20 build reproduced all eight previously qualified archives.
- A clean checkout with fresh npm installs passed the complete `prepare:release`
  gate on Node v24.18.1: 274 package tests, all integration, compiler,
  benchmark and audit gates; no quality regressions or inconclusive results.
- A new consumer project outside the repository installed all eight tarballs.
  Its five real HTTP requests covered malformed JSON, invalid input, service
  failure, invalid response and a successful request after all four failures.
  Rejecting logging promises were handled under `--unhandled-rejections=strict`.
- The documented object composition and checked pipeline flow worked; recursive
  declarations and input/output inference compiled with TypeScript 5.9.2 and
  7.0.2. Connection checking exited 2 for an incompatible client and 0 for its
  updated contract, preserving both baseline files.
- Chrome exercised the installed-consumer browser bundle: empty form → diagnostic
  → corrected value → `Accepted: Ada`. Desktop and 375×667 screenshots were
  inspected. The only initial resource error was a missing favicon; no application
  error was observed. This was an agent walkthrough, not the required human one.

Local evidence is under `.tmp/readiness/`: `walkthrough.mjs`, `walkthrough.json`,
`browser.json`, and `output/playwright/`. The consumer project was created at
`/var/folders/j8/zpx9s_7s4fvfmnfb5mbp9k2h0000gn/T/safe-shape-320-walkthrough-5nqrfP`. Node 24 gate log:
`/tmp/safe-shape-node24-release.log`; its raw quality report is in
`.tmp/release-verification/.tmp/quality/report.json`. Generated evidence remains
local and ignored by Git.

## Packaging issue found and corrected

The clean checkout exposed different CLI tarball permissions: `dist/cli.js` was
0644 there and 0755 in the previously installed workspace. Every file's bytes
matched; npm's installed executable still worked. The CLI build now explicitly
sets 0755, and the POSIX metadata gate rejects other modes. A negative check
confirmed that 0644 fails the gate. All 44 CLI tests and the installed executable
consumer check passed after the fix.

This changes the CLI archive metadata; hashes in the earlier qualification are
historical for that package. Final archives and their manifest are refreshed in
`release-artifacts/` and `.tmp/release-3.2.0-archives.json`. Linux CI now retains
both its quality report and tested tarballs, allowing exact content verification.
The [release instructions](release.md) also identify the current v3.1 baseline.

## Exact candidate CI and remaining human check

The isolated candidate branch is `codex/release-3.2.0-verification`. Consult its
[CI runs](https://github.com/dev-ik/safe_shape/actions/workflows/ci.yml?query=branch%3Acodex%2Frelease-3.2.0-verification)
for the final commit's Node 20.10.0 and Node 24 Linux results. A previous main/tag
run is not evidence for this candidate. Local runs above do not substitute for
that final remote result.

The [quality contract](release-quality-3.1.md) requires a developer outside the
implementation review to reproduce the quick start and a contract change.
The agent's fresh-project and browser passes do not mark that human gate complete.
There has been no merge to main, release tag, npm publication or GitHub release.
