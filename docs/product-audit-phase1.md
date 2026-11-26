# Lumo English product audit — Phase 1

Date: 2026-11-26

## Repository and baseline

The project is a Next.js 16 App Router application using React 19, strict TypeScript, Tailwind CSS 4, Framer Motion, Lucide, IndexedDB, Web Speech APIs, and Vitest. Existing route groups are `/`, `/onboarding`, `/learn`, `/lesson/[id]`, `/practice`, `/tutor`, `/vocabulary`, `/review`, `/progress`, `/settings`, plus `/api/health` and `/api/tutor`.

The curriculum is typed static content (16 lessons documented in the README) with validation in `src/content/index.ts`. Learning data is browser-local; XP, activity, attempts, lesson progress and SRS vocabulary are implemented in `src/lib` and `AppProvider`. The existing UI already includes responsive navigation, reduced-motion support, visible focus styling, keyboard paths for exercises, listening/speech fallbacks, and offline tutor scenarios.

Initial verification first could not start because dependencies were not installed (`vitest`, `tsc`, `eslint`, and `next` binaries were absent). After `npm ci`, the clean baseline was:

- Tests: 38 passed across 4 files.
- TypeScript: passed.
- ESLint: passed.
- Production build: passed; routes prerendered or rendered dynamically as expected.
- Vitest emitted a non-failing Vite config-loader warning.

## Findings and priorities

| Priority | Finding | Status / next step |
| --- | --- | --- |
| P1 · data integrity | Lesson completion persisted attempts, activity, progress, and vocabulary through separate transactions. A storage failure could leave a partial durable completion. | Fixed in Phase 1 with one IndexedDB read-write transaction and a rollback test. |
| P1 · duplicate actions | Completion state was not protected against concurrent repeated finish calls. | Fixed in Phase 1 by coalescing in-flight completion calls per lesson. XP remains first-completion-only. |
| P1 · tutor availability/cost | The existing API throttling map was process-local and had no hard cap on tracked client keys. It is still not a distributed production quota. | Added a memory ceiling and fail-closed behavior. Shared platform/provider quotas remain a launch requirement for public paid AI. |
| P2 · recovery | A live lesson's current answer/index is not persisted, so refresh interrupts a session. | Defer: design a versioned, discardable session checkpoint without confusing it with completed progress. |
| P2 · storage evolution | IndexedDB is schema version 1 and has no migration path beyond creating missing stores. No current migration is needed, but future schema changes need a non-destructive migration test. | Defer until a real schema change is proposed. |
| P2 · coverage | Unit tests cover scoring, XP, SRS, curriculum validation, backups, offline tutor, and now IndexedDB transactions. No end-to-end browser suite or visual/mobile device matrix is present. There was no CI workflow. | CI added for lint, typecheck, tests, and build. Add targeted browser-flow coverage before claiming full mobile/assistive-technology validation. |
| P2 · installability | No manifest/service worker is present. | Evaluate PWA caching and offline asset scope separately; do not imply cached availability until tested. |
| P3 · content breadth | 16 lessons cover A1, A2, and B1, but this audit did not independently verify every linguistic answer or claim full CEFR coverage. | Pedagogical review of specific lesson data should precede expansion. |

## Phase 1 changes

- Added `writeBatch()` to persist all records from a lesson completion within one IndexedDB transaction. Transaction abort leaves the previous store state intact.
- Coalesced simultaneous `finishLesson()` calls for the same lesson; a later deliberate practice run still records its practice attempts but cannot duplicate first-completion XP.
- Capped process-local tutor throttle keys to 5,000 and fail closed when the in-memory cap is reached; the configured request window/limit remains 20 requests per 10 minutes per key.
- Added `fake-indexeddb` as a development-only test tool and a rollback test covering a failed multi-store write.
- Added `.github/workflows/ci.yml` to install from the lockfile and run lint, TypeScript, tests, and production build on pushes and pull requests.

Post-change verification:

- Tests: 39 passed across 5 files.
- TypeScript: passed.
- ESLint: passed.
- Production build: passed.
- `git diff --check`: passed.
- The non-blocking Vite config-loader warning remains.

## Deferred scope

This phase intentionally does not redesign the dashboard, add curriculum lessons, implement session resume, add PWA caching, or claim WCAG/device certification. The existing behavior and schema were preserved; these require focused product and pedagogical decisions rather than broad rewrites.
