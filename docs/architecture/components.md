# Component Design

This document maps core components to the existing code labels and identifies where the planned enhancements will integrate.

## Runtime components (browser)

### App Entry / Bootstrap
- File: `src/main.ts`
 - Responsibility: load dataset, create root, mount app, fallback to error view on exceptions.
- Dependencies: `src/ui/app.ts`, `src/platform/clock.ts`, `src/data/questions.json`

### App Shell ("mountApp")
- File: `src/ui/app.ts`
- Responsibility: wire domain controller to UI views; render start/quiz/results/error screens.

### Domain Layer (Quiz)
- Files: `src/quiz/*.ts`
- Responsibilities:
  - `validateDataset.ts`: ensure rules at startup
  - `quizMachine.ts`: state transitions for the quiz flow
  - `timer.ts`: deadline math and auto-submit triggers
  - `scoring.ts`: score calculation
  - `controller.ts`: orchestrates events, updates to view, start/submit/restart

- Design constraint: `src/quiz/` modules are /in intention/ pure or nearly pure logic and easy to unit test with fake clocks.

### Platform Adapters
- File: `src/platform/clock.ts`
- Responsibility: provide abstractions for time, timers, and visibility change events.
- Role in enhancements: keep timer persistence correct by persisting `absolute deadlines` (endAt) and recomputing remaining time from `clock.now()`.

## Planned architecture additions

> These are additions/rewiring points, but no app code is introduced in this architecture doc PR.

### Persistence Adapter (optional feature)
- Proposed file: `src/quiz/persistence.ts`
- Role: versioned model for saving/loading a minimal attempt snapshot ("AttemptMemento") to/from `localStorage`.
- Interface:
  - `loadAttempt(): AttemptMemento | null`
  - `saveAttempt(memento): void`
  - `clearAttempt(): void`

### Resume UX (UX Option A)
- Integration point: `src/ui/startView.ts`
- Behavior: if a valid unfinished attempt exists, show "Resume" and "Start over" actions.

### CI Workflow
- Proposed file: `.github/workflows/ci.yml`
- Role: run the same gates as `npm run verify` on PRs/pushes (Playwright install, typecheck, lint, Vitest, build, E2E).

### Playwright Port Strategy
- Interface: `playwright.config.ts` sets baseURL from runtime ports rather than hard-coded
- Accepts env variables and/or free port allocation to avoid conflicts
