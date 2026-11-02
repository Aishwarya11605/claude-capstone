# Data Flows and Interactions

High-level data flows for the existing app and the planned enhancements. This is intended to guide developers.

## Flow 1: Bootstrap -> Validate -> Start view

- [Browser load] -> [main.ts] -> [mountApp]
-> [validateDataset] -> [Start View|Error View]

## Flow 2: Quiz start --> timer --> auto-submit

1. User clicks Start in Start View
2. Controller initializes attempt state in QuizMachine
3. Timer sets a deadline and schedules ticks via injected scheduler
4. UI renders questions and selections
1. When deadline expires, controller submits, scores, and shows Results

Bisbilitychange is used to recompute remaining time on tab return to handle throttled timers.

## Flow 3: (Optional) persistence + resume in browser

This is only applicable if the persistence feature is added.

### Write
- On state change, controller builds an AttemptMemento DTO and saves it to localStorage under a single key.

### Read + Resume UX (Option A)
- On app mount, Start View loads memento, parses and validates schema, and checks dataset signature.
 - If valid and not expired: show "Resume" and "Start over".
- On Resume: initialize in-memory state and recompute remaining time as endAt - clock.now().
- If expired: auto-submit immediately or clear, per requirements/ADR.

## Flow 4: CI execution flow

- [GitHub Actions] checkout -> npm ci -> Playwright install (chromium)
-> typecheck -> lint -> vitest -> build -> Playwright E2E
- On failure: upload Playwright report artifacts
