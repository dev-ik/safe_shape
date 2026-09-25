# SafeShape 3.2.1 documentation patch

Status: publication authorized; release verification in progress.

This patch publishes corrected package READMEs to npm. All eight packages,
their exact internal dependencies and the workspace lockfile use 3.2.1.
Runtime implementation, public API and dependencies outside the workspace
are unchanged from 3.2.0; the release checks verify the packaged output.

## Documentation changes

- Mark object composition, checked pipelines, recursive TypeScript declarations
  and producer/consumer connection checks as available since 3.2.0.
- Describe sync/async Standard Schema validation and custom diagnostic APIs
  consistently with the runtime.
- Fix English/Russian quick starts: export a quiet schema module, keep example
  logging in the application and create the snapshot output directory.
- Correct release metrics, benchmark budgets and the quality baseline; retain
  historical measurements as historical evidence.
- Expand package READMEs and point to current API and production-boundary guides.

Upgrade all installed `safe-shape` and `@safe-shape/*` packages together. This
patch adds no schema, snapshot or application migration requirement. The
[3.2.0 release record](release-candidate-3.2.0.md) describes the runtime features
and their limits. Its independent human walkthrough exception remains recorded;
automated documentation checks are not a new human walkthrough.

## Verification and publication

The final release record will include the exact candidate, full release gate,
archive comparison against 3.2.0, registry installation and published README
verification. Publication uses the existing trusted-publishing workflow and
does not replace the 3.2.0 tag or archives.
