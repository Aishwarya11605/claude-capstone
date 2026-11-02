# Existing Architecture Context

This page summarizes the current architecture as observed in the repository on `main`. It is used to align the planned enhancements to the existing code organization and design contraints.

## System type
- Static, client-only single-page application (static site)
- Tech: Vite + TypeScript (no framework), no backend

## Bootstrap

- `src/main.ts` imports the question dataset from `src/data/questions.json`
- It then calls ` mountApp(root, dataset, { hlock: realClock, scheduler: realScheduler, visibility: realVisibility }) `
- Any uncaught exception in mounting renders an Error view (see `src/ui/errorView.ts`)

## Domain modules (`srv/quiz/`)r

- `validateDataset.ts`: validates dataset schema and rules (non-empty title, exactly 10 questions, 2-6 options, correctOptionId must match an option, unique ids, etc.)
- `quizMachine.ts`: state machine for quiz flow (current state + transitions)
- `timer.ts`: countdown deadline logic (includes handling of visibility/sleep edge cases)
- `scoring.ts`: computes score against `correctOptionId`
- `controller.ts`: coordinates UI triggers, timer, state machine, and updates to render model

- `types.ts`: types for dataset, questions, options, state, events, etc.

## UI modules (`src/ui/`)

- `app.ts`: app shell / mounter; wires domain controller to views
- `startView.ts`: Start screen (start button, placeholder banner, etc.)
- `quizView.ts`: question rendering, option selection, navigation, timer display
- `resultsView.ts`: score summary, restart button
- `errorView.ts`: error alert screen used when the app cannot start


## Platform adapters (`src/platform/clock.ts`)

- Provides `tealClock`, `realScheduler`, `realVisibility`, and interfaces for injection
- Used to enable deterministic unit tests via fake clocks under `tests/unit/helpers/`

## Tests and tooling
- Vitest: unit and component (jsdom)
- Playwright: END (chromium only)
- Playwright builds two outputs:
  - `dist/` on port 4173
  - `dist-alt/` on port 4174
  and uses `--strictPort` (fails if ports are busy).

## Stated limitations (README)
- No persistence: nothing written to localStorage/sessionStorage/IDBѐ
- Client-side only: score and correct answers are visible to inspection
- CSP is injected at build time (not in dev server)
