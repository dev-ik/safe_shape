# Documentation translation policy

**English** | [Русский](ru/translations.md)

Current user guides, API references, operational guides and package READMEs have
Russian counterparts. English remains the source for API names, command flags
and diagnostic codes; Russian prose explains the same behavior and limitations.
Code identifiers are not translated. Historical release evidence and normative
RFC/ADR archives remain in English and are explicitly labelled in Russian navigation.

`docs/translations.json` records language pairs, reviewed English and Russian
SHA-256 hashes, and individually named historical exceptions. `npm run docs:check`
checks coverage of docs root/API pages and package READMEs, both language links,
and source drift. New current pages require a counterpart. An untranslated
archive exception requires an explicit reason; it must not hide a current API guide.

When a source changes, review and update the Russian counterpart before recording
new hashes for both files. Hashes establish which text was reviewed, not automatic
translation quality or semantic equivalence. There is deliberately no auto-accept
command. Review executable examples, defaults, supported domains, warnings,
version availability and links together. Release qualification includes this check.

The English roadmap retains historical detail; the Russian roadmap points to the
current release and labels the historical source rather than presenting old work as
pending. Package archives include both README.md and README.ru.md.
