# ADR-003: Resume UX — Option A (resume prompt on Start screen)

Date: 2026-11-02
Status: Approved (by owner)

## Context

If persistence is introduced, the app must decide whether to auto-resume on load or resume only after explicit user action.

Documentation and tests should match the chosen behavior.

## Decision

- On the Start screen, if a valid unfinished attempt exists in storage:
  - Show a "Resume" button to continue the attempt
  - Show a "Start over" option to discard the stored attempt and begin a new one
- Do not auto-resume on page load.

## Rationale

- Gives user control and avoids surprising "resume" after an intentional refresh
- Makes it clear that data is being stored (privacy transparency)
- Easier to test and document as a user-flow attribute on the Start view

## Consequences

- Requires START View UI update (to detect stored attempt and render actions)
- Requires ensuring deadline expiry is handled deterministically: if expired when user comes back, Resume path must submit/clear per requirements
