# Nataiji reliability and interface review — 2026-09-21

Base: fed52bb6c74cdec88444892260fdc79c6a6cbb80.

## Changes

- Capture the normalized input value during the change event's capture phase, instead of reading the previous grade from application state.
- Bind queued writes to their original account, class and term; reject queued work after the active account changes.
- Serialize bulk and single-cell grade writes. Keep failure/pending feedback visible until writes complete or a bulk retry succeeds.
- Prevent old bulk responses from replacing newer edits or another class's marks. Warn before closing while queued or failed saves remain.
- Cache only successful shell/assets responses. Never use HTML as an offline JavaScript response; bypass API and health requests.
- Reduce mobile header, welcome and settings card sizes and strengthen secondary text contrast. Official bilingual report content is unchanged.

## Verification

`npm run release:check` passes: server authentication/account isolation smoke tests, 13 focused regression tests and 48 static release checks. Regression tests simulate delayed and failed requests against the real frontend save functions; they do not exercise a production PostgreSQL instance.

The production homepage loaded in the connected browser. The browser refused localhost access (`ERR_BLOCKED_BY_CLIENT`), so these new visual changes have not been verified in a rendered mobile session.

## Remaining release checks

- Render workspace confirmation is required by the connector before retrieving deployment/database status.
- Verify the modified build visually on Android at narrow widths and in French, plus physical keyboard/soft keyboard behavior.
- Exercise full report generation, A4 two-student printing, all-absent suppression and annual calculations with a disposable database. These flows were not end-to-end revalidated in this pass.
- Test backup restoration and concurrent teachers against the production-equivalent database. No production data was modified during this review.
- The frontend has multiple overriding scripts. A future consolidation should preserve current behavior with regression coverage rather than deleting legacy files blindly.
