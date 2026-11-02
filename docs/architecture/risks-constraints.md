# Risks and Constraints

## Constraints (from repo evidence and implementation plan)

- Static site, no backend: all features must remain browser-only.

- No framework: UI is hand-rendered DOM. Enhancements must fit the existing module setup in `src/ui/` and `src/quiz/`.

- CSP in prod: tests and changes must preserve binding to build-time CSP injection.

- Test set: E2E tests build and preview outputs, and currently rely on two preview servers.

## Risks

### R1 — Playwright fake failures from fixed ports
- Current state: ports 4173/4174 have to be free.
- Mitigation: adopt dynamic port allocation or env-configurable ports (ADR recommended). Tests should stop assuming fixed urls.


### R2 – Persistence conflicts with existing documented limitations
- Risk: README currently states "No persistence". If persistence is added, documentation and acceptance criteria must be updated.
- Mitigation: gate feature as 'optional', make storage behavior explicit, add ADRs and clear user-facing text.

### R3 – Stored data corruption / schema evolution
- Mitigation: versioned attempt memento, strict parse/data validation, and behavior to clear on mismatch/invalidity.

### R4 – Timer correctness ensuring expiry and resume semantics
- Mitigation: persist `endAt ` and recompute from injected clock; test with fake clocks and edge cases (clock change, suspend/resume)


### R5 — CI environment drift
- Mitigation: pin Node via `.nvmrc`, cache Playwright binaries, upload artifacts for diagnosis
