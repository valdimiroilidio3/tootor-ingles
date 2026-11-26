# Lumo English — personal language-learning app

A private, single-user, mobile-first app for learning **English from Portuguese**. It combines structured lessons, spaced-repetition vocabulary, listening and pronunciation practice, real-life role-plays and an optional AI tutor.

* No account, no subscription, no mandatory paid API.
* All learning data is stored **locally in your browser (IndexedDB)** — nothing is uploaded unless you explicitly enable an external AI provider.
* Original brand, mascot (**Lumo**, a yellow robot) and UI.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Lucide React · Framer Motion · IndexedDB · Web Speech API · Vitest. Inter is self-hosted via `@fontsource-variable/inter`.

> A lightweight `/api/health` liveness endpoint is available for hosting checks. The learning app does **not** require PostgreSQL or a database URL; learner data stays in the browser.

## Setup

Requirements: Node.js 20+ (22 recommended) and npm.

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build
npm run start
```

Unit tests (scoring, XP, spaced repetition, streaks, curriculum validation, backup, offline tutor, IndexedDB migration and session validation):

```bash
npm test             # = vitest run
```

Browser tests (Playwright + Chromium; installs a separate browser binary):

```bash
npx playwright install --with-deps chromium   # Linux/CI; on macOS/Windows use: npx playwright install chromium
npm run test:e2e
```

CI runs these browser tests in a separate job. The app starts its own local Next.js server for tests; no AI credentials or paid services are needed.

Type checking and linting:

```bash
npx tsc --noEmit
npm run lint
```

Deploying to **Vercel** works out of the box (no environment variables are required). Local Ollama mode cannot work from Vercel (see below).

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Dashboard: greeting, daily XP goal, streak, total XP, continue button, path preview, daily challenge, review reminder, recent mistakes, weekly summary |
| `/onboarding` | Level, goal and daily goal, plus a 10-question placement quiz that recommends a starting lesson |
| `/learn` | Full learning path with locked / unlocked / completed lessons |
| `/lesson/[id]` | Lesson engine (intro → exercises → summary) and the daily challenge (`/lesson/daily-YYYY-MM-DD`) |
| `/practice` | Real-life scenarios, key phrases, pronunciation practice |
| `/tutor` | Conversation tutor with personalities, difficulty, scenarios, feedback, history and summaries |
| `/vocabulary` | Personal notebook with search, filters, manual add, audio |
| `/review` | Flashcards with spaced repetition |
| `/progress` | Analytics derived from saved activity |
| `/settings` | Preferences, voice, AI mode, export / import / reset |

## Curriculum

16 lessons in `src/content`: **10 A1** foundations, **3 A2** and **3 B1** lessons. Every lesson has an objective (EN + PT), CEFR-inspired level, vocabulary with examples, 8–12 exercises with Portuguese explanations and an XP reward. All nine exercise types are used: multiple choice, translation, word ordering, matching, fill-in-the-blank, listening, dialogue completion, sentence construction and reading comprehension.

Content is static, typed data validated by `validateCurriculum()` (also run in the unit tests). Exercise options are shuffled with a **seeded** shuffle, so nothing changes randomly between renders. To add a lesson, create it with the helpers in `src/content/builders.ts` and add it to `LESSONS` in `src/content/index.ts`.

## How the main systems work

* **XP & levels** (`src/lib/xp.ts`): XP for a lesson is 60–100 % of its base XP depending on accuracy and is **awarded only on the first completion** — reopening a lesson is a practice run with no extra XP. Level *n* starts at 50·(n−1)² XP. The daily XP goal is `minutes × 4`.
* **Hearts**: 5 per lesson attempt. Running out ends the attempt without losing any XP; you review your answers and retry.
* **Streaks** (`src/lib/stats.ts`): a single missed day never breaks a streak.
* **Spaced repetition** (`src/lib/srs.ts`): familiarity 0–6 with intervals of 0, 1, 2, 4, 8, 16 and 32 days. “Again” drops two levels and returns in 10 minutes. New, overdue and frequently missed words are prioritised. Practising ahead of schedule earns no XP.
* **Daily challenge**: 5 exercises chosen deterministically from the date and the lessons unlocked at the start of the day. XP once per day.
* **Everything on the dashboard and progress pages is computed from saved attempts, activity and vocabulary** — there are no demo numbers.
* **Lesson recovery**: unfinished and failed lessons save a versioned checkpoint (exercise, submitted answers, current answer/matching draft, hearts and elapsed time) in IndexedDB. Refreshing or leaving the page can be followed by an explicit resume or restart choice. A successful completion writes its attempt/activity/progress/vocabulary and removes its checkpoint in one transaction; an unfinished lesson is never counted as completion. If a storage write fails, the last committed checkpoint remains intact and the app warns that changes may be only in memory.
* **IndexedDB upgrades**: the current schema is version 2. Upgrading v1 creates only the new `sessions` object store; it does not clear, recreate or rewrite existing learner stores. Session payloads are validated against the current lesson and version before recovery. Unknown versions or malformed checkpoints are rejected rather than migrated speculatively; export a backup before manually changing browser storage.

## Speech and listening

`src/lib/speech.ts` wraps the browser Web Speech API.

* Text-to-speech with normal and slow playback, and a selectable English voice and speed (Settings).
* Optional speech recognition (Chrome, Edge, Safari). The recognised text is **always shown for confirmation and can be edited**; a text box is the fallback everywhere.
* Microphone permission is requested by the browser on first use. In Chrome/Edge recognition may send audio to the browser vendor; Lumo itself never uploads audio. Firefox has no speech recognition.
* Recognition compares **text**. It is **not** a phonetic or pronunciation score and the app does not claim otherwise.

## AI tutor

The tutor service is provider-independent (`src/lib/tutor.ts`).

1. **Offline (default)** — 8 scripted role-plays (introducing yourself, ordering food, shopping, directions, airport, colleagues, job interview, everyday conversation) with suggested replies, three personalities, three difficulty levels and Portuguese support. Feedback comes from rule-based hints for common Portuguese-speaker mistakes plus model and alternative sentences. It is deliberately limited and does not claim to be a full grammar checker.
2. **Local AI (Ollama)** — a server-side adapter (`/api/tutor`) calls your local Ollama.
3. **External OpenAI-compatible API** — same adapter, credentials read from server environment variables only.

### Ollama quick start

```bash
ollama pull llama3.2
ollama serve                 # usually already running on http://127.0.0.1:11434
npm run dev
```

Then open **Settings → AI tutor → Local AI (Ollama)** (or choose the engine on the Tutor page). Optional variables in `.env.local`:

```
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
```

### External provider (optional)

```
AI_API_BASE_URL=https://api.openai.com/v1
AI_API_KEY=...
AI_MODEL=gpt-4o-mini
```

These stay on the server and are never sent to the browser. In this mode your tutor messages are sent to that provider — the app says so wherever you enable it. See `.env.example`.

If a provider is down, the tutor shows a clear error with **Try again** and **Continue with offline tutor** (the conversation continues from the same step). AI feedback is learning assistance, not a guaranteed linguistic or pronunciation assessment. Ollama only works when the app runs on the same machine/network as Ollama (not on Vercel).

The tutor API currently allows 20 requests per IP in a 10-minute window using a bounded, in-memory process-local map. This is a best-effort throttle for a single process, **not** a distributed or durable quota: serverless instances/restarts have separate or reset counters, and proxy IP headers must be trusted/configured correctly. The connected production project for this app is Vercel `lumo` on the Hobby plan, deployed as Next.js Lambdas; this is exactly a multi-instance context where the in-memory map must not be treated as an enforceable quota. Before exposing paid external-provider credentials, configure and verify a shared atomic quota service compatible with the chosen Vercel plan (for example, a separately provisioned Upstash Redis integration) or a trusted edge rate limit, including limits and IP-header trust. No remote store or quota credentials are present in this repo, so none has been added or enabled.

## Data management

Settings → **Your data**:

* **Export** — downloads a versioned JSON backup of everything.
* **Import** — the file is fully validated before anything is written (`src/lib/backup.ts`); you confirm before your data is replaced.
* **Reset** — requires typing `RESET`; preferences are kept.
* Storage failures (e.g. private browsing) show a visible warning and the app keeps working in memory.

## Accessibility & design

Colours: yellow `#FFE500`, cream `#F7F5EF`, ink `#20201D`, white surfaces, soft green/red feedback. The secondary text colour is `#6C6B64` (slightly darker than the suggested `#77766F`) so it meets AA contrast on the cream background. Keyboard navigation, visible focus rings, a skip link, ARIA roles for radio groups and progress bars, `prefers-reduced-motion` support, desktop sidebar and mobile bottom navigation.

## Not included / limits

* One language pair (Portuguese → English).
* Placement quiz and statistics are study aids, **not** a formal CEFR assessment.
* Data is per browser/device; use export/import to move it.

## Project layout

```
src/app/            routes (+ api/tutor, api/health)
src/components/     UI kit, shell, mascot, exercise engine, lesson runner, speech, tutor
src/content/        lessons, diagnostic, scenarios (static data)
src/lib/            scoring, xp, srs, stats, idb, backup, speech, tutor, placement
src/lib/__tests__/  unit tests
```
