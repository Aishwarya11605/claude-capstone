# ADR-004: CI quality gates via GitHub Actions

Date: 2026-11-02
Status: Proposed (planned)

## Context

README documents the expected CI command sequence but the repo currently has no `.github/workflows` file. The implementation plan requires adding a pred-integration gate to regressions.

## Decision

- Use GitHub Actions as the CI platform.
- On PR and push to `main`, run (equivalent to) `npm run verify` :
  - `npm ci`
  - npx playwright install --with-deps chromium (Linux)
  - `npm run typecheck`
  - `npm run lint`
  - `npm test`
  - `npm run build`
   - `npm run test:e2e`
- Cache npm and Playwright browser binaries when possible.
- Upload playwright-report artifacts on failure.