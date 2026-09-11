# ADR 0031: Isolated release quality fixtures

## Status

Accepted.

## Decision

Keep pinned comparative, compiler, bundler, and external resolver dependencies
in a private `quality/` package with its own lockfile outside published workspace
packages. The release gate runs its harness after building the workspace.
Install consumer tarballs in independent temporary applications. Build the
matched 3.0 baseline from the local release tag; do not compare against a mutable
registry package or another runner revision. CI fetches tags and runs on the
minimum declared Node version and its existing Node 24 environment.

Reports retain source identity, raw samples, fixture versions, outcomes, and
unverified external gates. Budget misses fail the automated gate. A core-only
measurement difference with identical compiled core artifacts is explicitly
recorded as measurement noise, not labeled a production code regression; this
exception never applies to changed artifacts or compat performance.

No production package gains Zod, React, compiler, or bundler dependencies.
Human walkthroughs and remote CI evidence remain independent release gates;
automation cannot certify that they happened.
