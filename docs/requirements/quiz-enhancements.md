# Requirements & Implementation Scope (Approved)

This repository is a client-side (no-backend) quiz web app.

## In scope (mandatory)

### 1) Local persistence and resume of active attempts

The application MUST:

- Persist **active quiz** state locally in the browser.
- Persist:
  - selected answers
  - an **absolute** timer deadline (epoch milliseconds)
- Validate saved data using:
  - a **schema version**
  - a **quiz dataset signature** (to detect incompatible datasets)
- Restore a valid active attempt after a page reload.
- Provide **Resume** and **Start Over** actions.
- Clear persisted data on:
  - manual submission
  - timeout auto-submit
  - Start Over
- Handle saved attempts gracefully when they are:
  - unavailable (storage not accessible)
  - corrupted/unparseable
  - incompatible (schema/dataset mismatch)
  - expired (deadline in the past)

### 2) GitHub Actions CI

The repository MUST include `.github/workflows/ci.yml` that runs the canonical verification scripts for this project on pull requests.

> Note: Do not claim the workflow passed unless an actual GitHub Actions run is verified.

### 3) Documentation

Documentation MUST reflect:

- persistence/resume behavior and limitations
- CI workflow presence and what it runs
- architecture decisions (ADR) for persistence strategy

## Out of scope

- Results review / per-question breakdown UI
- Question navigation aids
- Manual submit confirmation
- Backend, authentication, server-side persistence, and unrelated enhancements
