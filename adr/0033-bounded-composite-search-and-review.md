# ADR 0033: Bounded composite search and CLI review rendering

## Status

Accepted.

Extend compat's existing counterexample module with bounded source candidate
pools and target hints. Core validators remain the semantic authority; every
returned witness is checked against both reconstructed root validators. Avoid
an unbounded Cartesian product and expose construction exhaustion honestly.

Keep Markdown rendering in a separate CLI module consuming existing reports.
It may escape and arrange evidence but cannot alter compatibility decisions or
infer deployed consumer identities. No third-party renderer or core dependency
is needed. CLI comparison and witness generation reuse the same next snapshot.
