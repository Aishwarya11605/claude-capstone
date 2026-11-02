# ADR 0001: Persist active attempt in localStorage with schema version + dataset signature

## Status

Accepted

## Context

The quiz app is a client-only SPA. Reloading the page loses active progress, including selected answers and the countdown.

We need a way to resume a still-valid active attempt after reload without introducing a backend.

## Decision

- Persist the active attempt in `localStorage`.
- Persist:
  - answers (`questionId -> optionId`)
  - an **absolute** deadline (`deadlineEpochMs`)
  - compatibility metadata (`schemaVersion`, `datasetSignature`)
- On load, only offer resume if the saved attempt:
  - parses and validates
  - has the expected `schemaVersion`
  - matches `datasetSignature`
  - is unexpired (`now < deadlineEpochMs`)
- Clear the saved attempt on manual submit, timeout submit, and Start Over.

## Consequences

- Resume works across reloads but remains entirely client-side.
- If the dataset changes (even slightly), saved attempts are intentionally invalidated.
- Storage may be unavailable; the quiz must still function without persistence.
- A non-cryptographic hash is sufficient for signature (compatibility check, not security).
