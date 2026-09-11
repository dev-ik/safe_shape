# Independent Developer Walkthrough

Status: not performed. A developer other than the implementation author should
record the environment, commands, results, and any undocumented steps here or
in the release evidence. Do not turn this checklist green from automated tests.

1. From a clean checkout, follow the quick-start to install SafeShape, define a
   nested schema, and inspect one successful and one failed parse.
2. Follow `docs/ci.md` to create a reviewed v2 baseline and a check-many manifest
   with a request and a response. Run the check without implementation help.
3. Require a new field or narrow a string constraint. From the report alone,
   identify the path, direction, affected HTTP role, and proposed next action.
4. Introduce an opaque rule change and a missing export. Confirm that manual
   review differs from an operational error and later checks still appear.
5. Check that baseline files were not modified. Describe the deliberate process
   for approving a new baseline after a coordinated migration.
6. Record required casts, confusing labels, missing setup, and any blockers.

Acceptance: no unresolved blocking issue in the documented path. Record actual
feedback, including failures; a successful automated consumer fixture is not a
substitute for this walkthrough. This exercise does not establish production
adoption or broad parity with another library.
