# Causa OS Security Repair Audit Log

## Follow-up on 2026-10-09

The snapshot below is historical, not current production status. C-01 (#94,
merge `5e3280f`) and A-04 (#95, merge `322fc31`) were merged on October 8.
PRs #96, #97 and #98 were still open when this follow-up started against
`origin/master` at `7dab0e8`.

The current adaptation preserves #96's exclusion of `staff_directory`, adds an
immutable owner check to `sync_history`, and checks legitimate login queries,
UID profiles and sede alias `in` queries in the emulator. C-02 is not authorized
for activation solely by passing those tests: real registered UID profiles and
authenticated callables must also pass `scripts/verifyDirectoryAccess.mjs`
before changing `/users` access. This verification logs only aggregate counts,
not production identities or credentials.

The [read-only production preflight](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/37944773168)
at C-02 commit `ae243f4` examined 206 user documents and 51 active registered
UID accounts: 8 lacked administered roles/sede and 1 had an unverified email.
It failed before any function or rule deployment. This is a **data-readiness
blocker**, not a claim that credentials are missing. No roles, sedes or
assignments were inferred or changed.

C-02 remains in draft #97, retargeted from the historical C-01 branch to
`master`, with the original history and adapted implementation preserved.
Its initial adapted [CI run](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/37944663082)
passed application tests, build and the emulator (including own-login aliases
and all canonical sede alias `in` queries). Further regressions cover the
actual caller UID preference, legacy recipient emails, and explicit backend
failures. The backend is **not deployed or smoke-tested in production**.

The independently deployable replacement for #96 contains A-01 and this audit
log only; it does not change `/users`, AuthContext, functions or the directory
client. `staff_directory` stays readable/writable by authenticated users;
`qt_directory` reads are unchanged. The learning page reports a restricted
ranking rather than displaying a misleading empty leaderboard.

No IMO, letters/campus, production data migration or new broad audit is included.

**Snapshot as of:** 2026-10-07 23:35 (-05:00) / 2026-10-08 04:35 UTC

## Status and scope

The staged repairs tracked here are C-01 ([PR #94](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/pull/94)), A-04 ([PR #95](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/pull/95)), partial A-01 ([PR #96](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/pull/96)), C-02 ([PR #97](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/pull/97)), and deferred A-02. **None of these repair PRs has been merged or deployed** as of this snapshot. A passing PR check is validation, not deployment.

The PR file lists show no changes to `src/config/permissions.js`; no production data changes are included in these repair PRs. This log records branch state and validation evidence, not a claim that production behavior has changed.

| Repair | Current PR state and exact refs | Validation observed | Scope limits and open items |
| --- | --- | --- | --- |
| **C-01** | #94 **OPEN, not draft**. Base `master` at `c64845ffa0f3315e1f9a135c2d1f9f680f30b4e7`; head `crearpodersinlimitesperu-cmd-protect-causa-os-task-c01` at `1bb9a27609f1895b7eb3ade115b7b92226610f38`. | [Validate run](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/37727590309) passed on the head SHA: `npm test`, production build, and Firestore emulator `npm run test:rules` (`tests/firestore-task-privacy.test.mjs`). | Catalog-shaped checklist tasks are excluded from the critical/mass-create restriction to preserve their initial-touch flow. Task read/update/delete rules are unchanged. Verify before merge that users authorized only by the `isGerenteODireccion()` email whitelist, without a verified `users/{uid}` profile, are not unexpectedly denied when creating ROJO tasks in `TaskAssignmentModal`. |
| **A-04** | #95 **OPEN, not draft**. Base `master` at `c64845ffa0f3315e1f9a135c2d1f9f680f30b4e7`; head `crearpodersinlimitesperu-cmd-a04-stop-ip-capture` at `b49c2ae2bcf1ce6ad57e5759fa188793945ee13c`. | [Validate run](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/37725812804) passed: `npm test`, production build, and Firestore emulator `npm run test:rules` (`tests/firestore-task-privacy.test.mjs`). The added `tests/audit-no-ip-capture.test.mjs` is not listed in either test command in this run. | The change stops IP/location/user-agent capture through `auditService`; it preserves historical fields rather than deleting old records. `legalSignatureService.js` has a separate ipify use outside this PR's scope. |
| **A-01 (partial)** | #96 **OPEN, draft**. Base `master` at `c64845ffa0f3315e1f9a135c2d1f9f680f30b4e7`; head `crearpodersinlimitesperu-cmd-a01-hardening-parcial-reglas` at `e57a5f89a3bebd123e0bb215980e9ba20c6aa09d`. | [Validate run](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/37727142030) passed: `npm test`, production build, and Firestore emulator `npm run test:rules` (`tests/firestore-task-privacy.test.mjs` and `tests/firestore-a01-hardening.test.mjs`). | `staff_directory` was removed from this PR after its own-email list query failed with `permission-denied`; it remains unchanged and readable by authenticated users. `kpi_reports` and `managers_directory` are also outside the change. `qt_directory` writes are restricted, but reads remain available to any authenticated user. Known behavior includes denied `sync_history`/`user_stats` access during simulated-user sessions and denied `sync_history` writes for `userEmail='Desconocido'`. |
| **C-02** | #97 **OPEN, draft**. Base branch is #94's `crearpodersinlimitesperu-cmd-protect-causa-os-task-c01` at `17514a591ee910030abefd6aeb8348adc9fb3d3b`; #94 now points to `1bb9a27609f1895b7eb3ade115b7b92226610f38`. Head `crearpodersinlimitesperu-cmd-improved-chainsaw` at `a5da784e148f2563d738520c5d7af2046d3ab541`. | **No checks reported** on the remote head as of 04:35Z. Per the C-02 owner's update, C-01 has been integrated locally and 58 unit tests passed with Firebase I/O simulated. This is agent-reported local test evidence only; build, push, and CI are pending, and it is not Firestore-emulator validation. | Before merge/deploy, run the full CI suites; verify the `sede in [aliases]` query against the rules; validate in staging and measure `permission-denied`; and deploy the callable functions before or with the rules that depend on them. A successful CI validation has not been established. |
| **A-02** | **Deferred; remains open.** No repair PR is recorded here. | No verified deployed callable/backend is available as evidence for safely closing the related rules. The latest read-only backend readiness run consulted ([run](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/37470940428), 2026-10-06) reported callable function states as failed/unknown, including missing Cloud Run service and, for one function, missing Eventarc trigger. | A direct rule closure remains risky given the current mail-daemon behavior. Keep A-02 open; do not treat it as fixed or close rules on the assumption that a callable is deployed. The scheduled mail-daemon run succeeding is not evidence that the required callable/backend exists. |

## Deployment distinction

PR #93, **“Improve responsive task lifecycle and loading experience,”** was merged to `master` as commit `c64845f`. The successful [Firebase Hosting workflow run](https://github.com/crearpodersinlimitesperu-cmd/SO-AR/actions/runs/37724252343) ran on that master commit after the merge. This was the unrelated responsive-task PR, not any of the repairs above. Its deployment does not establish that repair-branch code or rules were deployed; **PRs #94–#97 remain unmerged and undeployed**.

## Evidence consulted

GitHub PR metadata, descriptions, changed-file lists, and checks for #93–#97; CI logs for the validation runs linked above; the master deployment run for #93; the read-only backend-readiness run for A-02; and recent scheduled mail-daemon run records. Status and validation statements above are snapshots as of the timestamp at the top of this log.
