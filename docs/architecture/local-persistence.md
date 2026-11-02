# Architecture – Local Persistence and Resume

## Overview

This quiz app is a static, client-side SPA. To support resuming an active attempt after reload, the app persists attempt state in `localStorage`.

### What is persisted

A single "active attempt" record is stored under a stable key:

- `schemaVersion` (number)
- `datasetSignature` (string)
- `deadlineEpochMs` (number; **absolute** deadline)
- `answers` (record of `questionId -> optionId`)

### Compatibility and validation

On startup, the app computes a dataset signature from the current dataset.

A saved attempt is considered resumable only when:

- `schemaVersion` matches the current schema
- `datasetSignature` matches the current dataset
- `Date.now()` is strictly less than `deadlineEpochMs`
- the saved payload parses and validates

If any of those checks fail, the app clears the saved attempt and continues normally.

### UI behavior

- If a resumable attempt exists, the Start screen shows:
  - **Resume Quiz** (continues the attempt)
  - **Start Over** (clears saved attempt and returns to a fresh start)
- Otherwise the Start screen shows **Start Quiz**.

### Clearing saved state

Saved attempt data is removed when:

- the user submits manually
- the quiz auto-submits due to timeout
- the user clicks Start Over

### Notes / constraints

- Persistence is purely client-side (no backend).
- Storage availability is not guaranteed (private mode / blocked storage). The app continues to function without persistence.
