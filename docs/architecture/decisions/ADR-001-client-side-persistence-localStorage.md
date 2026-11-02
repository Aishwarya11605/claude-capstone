# ADR-001: Client-side persistence via localStorage

Date: 2026-11-02
Status: Proposed (planned)

## Context

The app is a client-only, static SPA. README explicitly states "no persistence". The approved implementation plan adds an optional feature to persist an in-progress attempt so a user can resume after a reload/crash.

Constraints: no backend, no auth, static hosting.

## Decision

- Persist the minimum resume data as a versioned DTO ("AttemptMemento") in `localStorage`.
- Use a single well-known key (e.g. `claude-capstone:attempt:1`).

Data to store (example):
- schemaVersion
- datasetSignature
- endAt (absolute epoch ms)
- currentQuestionIndex
- answers (by question id/index)
- submitted flag (optional)

## Consequences

Positive:
- Users can recover from accidental refresh/crash
- No new infrastructure or backend
- Versioned memento supports schema evolution

Trade-offs / limitations:
- Data is tamperable (browser storage); not suitable for high-stakes quizzes
- Storage quota and privacy considerations (keep payload small, no PII)
- IF enabled, documentation must be updated (README limitations change)

## Alternatives

- SessionStorage: lost on browser session end; less useful for recovery
- IndexedDB: more complex than needed for a single small memento

## Implementation notes

- Validate memento schema strictly, swallow JSON parse errors, and clear on invalidity.