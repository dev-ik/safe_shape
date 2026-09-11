# RFC 0042: Multi-contract CLI checks

## Status

Accepted for implementation under the approved multi-contract checking scope.
Target: additive 3.1 capability; package versions remain unchanged until release.

## Contract

Add `safe-shape [--json] contract check-many --manifest <file>`.
Only `--manifest`, `--json`, and help flags are accepted by this new command.
Existing commands and their output remain unchanged.

The JSON manifest has exactly `version: 1` and a non-empty `contracts` array.
Each entry has a unique non-empty `name`, a `module` path, an `against` baseline
path, and optional `export` (default `default`), `compatibility` (default
`backward`), `side` (v2 only; default `input`), and `exchange` (`request` or
`response`). Names label checks, not snapshot identities. Paths resolve relative
to the manifest directory, not the working directory. Unknown keys, invalid
field types, duplicate names, unsupported values, and empty lists are errors.
Validate the entire manifest before importing any schema modules.

Run entries sequentially in declaration order using existing comparison rules.
Repeated imports use normal Node ESM caching. Modules are trusted executable
contract code, just as in the single-contract command. No baseline is written.
Continue after per-entry operational errors; no concurrency or implicit retries.

## Output

A completed batch writes one JSON envelope to stdout with:

- `ok`, `command: "contract check-many"`, and absolute `manifest` path;
- `counts`: `total`, `compatible`, `migrationRequired`, `manualReviewRequired`,
  `errors`; migration and review counts are independent and may overlap;
- `results` in manifest order.

Successful evaluations retain `name`, absolute `module` and `against`, `export`,
`format`, the complete existing compatibility report, and `migration`. Optional
`exchange` adds `http` via the existing HTTP compatibility projection.
An operational-error entry has `name`, `ok: false`, and `error: {code, message}`.
It does not fabricate a compatibility status or migration decision.

Exit 1 if any operational error occurred, otherwise 2 if any contract requires
migration or manual review, otherwise 0. Per-entry errors stay in the completed
stdout report; stderr is empty. Manifest/flag failures use the existing stderr
CLI error envelope with no partial stdout report; manifest failures use
`invalid_contract_manifest`. Schema modules' own console output is not captured.

Text mode writes a summary and every entry to stdout, including paths,
directions, finding codes, migration suggestions, and HTTP roles when requested.
Save reports using normal stdout redirection to a file separate from inputs.
No output-file flag, baseline replacement, globs, config discovery, Markdown
renderer, or new programmatic API is included.

## Validation

Test mixed outcomes and exit precedence, later entries after errors, manifest
validation before imports, relative paths independent of cwd, v1 side rejection,
v2 output, HTTP roles, text output, and byte-for-byte baseline preservation.
Run the same journey through an installed tarball consumer.
