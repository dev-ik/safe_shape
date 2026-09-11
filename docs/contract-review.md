# Contract review artifacts

Introduced in 3.1.0. Generate Markdown from the existing
compatibility, migration and optional counterexample reports:

```sh
safe-shape contract check --module ./schema.mjs --against ./baseline.json --counterexamples --markdown > review.md
safe-shape contract check-many --manifest ./contracts.json --counterexamples --markdown > review.md
```

The artifact includes decisions, directions, input/output side, fingerprints,
changed paths, reasons, suggested actions, and complete JSON witnesses where
available. Batch entries include HTTP roles when the manifest specifies an
exchange. They retain operational errors and continue reviewing other entries.
An unavailable witness is labelled explicitly; the original compatibility
decision remains the authority. The report does not discover deployed consumers
or create a migration automatically.

Use `--counterexamples` to include examples. Without it, Markdown still presents
the original findings and migration diagnostics. User-controlled headings and
diagnostics are escaped, and JSON uses protected code fences. See the
[counterexample domain and limits](counterexamples.md).

`--markdown` writes to stdout for compatible and incompatible results, including
mixed batch errors. Exit codes stay 0 for compatibility, 2 for migration or
manual review, and 1 for operational errors. An invalid manifest or command
fails before producing an artifact, with an error on stderr. In CI, retain the
artifact even when the command returns nonzero and preserve its exit status:

```sh
status=0
safe-shape contract check-many --manifest ./contracts.json --counterexamples --markdown > review.md || status=$?
# Upload review.md with the CI provider's artifact mechanism.
exit "$status"
```

`--markdown` is valid only for `contract check` and `contract check-many` and
cannot be combined with `--json` or `--out`. Invalid combinations are rejected
before loading schema modules. Use shell redirection to a separate report path;
never redirect to a baseline. Default JSON/text output is unchanged.

The CLI generates a local artifact only. It does not post PR comments, update
baselines, tag a release, or publish packages.
