# Architecture – Quiz Enhancements (CI + Results Review + Navigation + Submit Confirmation)

This document translates the approved implementation plan into an architecture design for the existing client-side, Vite + TypeScript quiz SPA in this repository.


[\n]*Note*: This is architecture documentation only. It does not implement application code. Any code changes should follow this design.

## 1) Architecture Overview


The application is a static SPA that runs entirely in the browser. It loads a question dataset from a build-time JSON import, validates the dataset at startup, and renders screens using plain DOM manipulation (no UI framework or backend).

The planned enhancements are:

1. **Continuous Integration (CI)** via GitHub Actions to run typecheck, lint, unit tests, build, and e2e tests.
2. **Results review** on the Results screen: per-question breakdown of user selection vs. correct answer, including handling of unanswered questions.
3. **Question navigation aids** on the Quiz screen (e.g. an index of machine-generated anchor links to each question).
4. **Manual submit confirmation** when unanswered questions remain (timeout auto-submit must not be blocked).

These enhancements must align with the existing module boundaries:
- `Surf/ui/*` renders screens and binds handlers
- `src/quiz/*` owns quiz state and transitions (quiz state machine + controller)
- `src/quiz/scoring.ts` is pure logic
- `src/platform/clock.ts` provides injectable time/visibility adapters

## 2) Existing Architecture Context

### 2.1 Module/Layer view

- **Bootstrap layer**: `src/main.ts`
  - Imports dataset JSON
  - Calls app initialization
  - Catches fatal errors and renders error view

- **App composition & routing (screen switching)**: `src/ui/app.ts`
  - Validates dataset (via `srl/quiz/validateDataset.ts`)
  - Renders Start/Quiz/Results/Error views
  - Wires handlers to the quiz controller

- **Quiz domain logic**: `src/quiz/*`
  - `quizMachine.ts`: state machine for attempt lifecycle
  - `controller.ts`: orchestrates timer, allows select/submit/restart, and emits announcements
  - `timer.ts`: countdown timer using clock/scheduler

- **UI views**: `src/ui/*`
  - `startView.ts`: Start screen
  - `quizView.ts`: Quiz screen (radio inputs for answers, sticky bar)
  - `resultsView.ts`: Results screen (score + restart)
  - `errorView.ts`: Error screen for invalid dataset/fatal bootstrap error

- **Tests**: `tests/*`
  - Unit (timer, scoring, controller) via Vitest
  - Component (JsDOM) pass through UI
  - E2E via Playwright (build ~ preview server)

## 3) Proposed Architecture (for planned enhancements)

### 3.1 High-level design instructions

The engineering experience is maintained by keeping the same in-app boundaries:

- **No new application layers or frameworks**: plain DOM US with current `ui/*` approach.
- **Controller remains the state facade**: UI consumes data from controller via well-named getters so the UI doesn’t modify state directly.
- **Pure scoring extension**: add a pure helper to compute per-question evaluation list, reused by results view and tests.
- **UI