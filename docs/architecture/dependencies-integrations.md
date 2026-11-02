# Dependencies and Integrations

This page documents the external dependencies and integrations that affect the planned enhancements.

## Runtime dependencies (browser)

- Browser DOM API
- Browser timers and visibility events (abstracted via `srv/platform/clock.ts`)
- (Optional feature) `Browser localStorage` if persistence is implemented

## Build/test dependencies

- Vite: build and dev server
- TypeScript (`tsc`): typecheck
- ESLint: static analys; additional security linting (no innerHTML, nostyle, etc.)
- Vitest: unit and component tests
- Playwright: E2E tests (Chromium project)

## CI Integrations (planned)
- GitHub Actions: run the same steps as README on PR/push (npm ci, playwright install, typecheck, lint, test, build, e2e)
- Artifact publishing on failure: playwright-report and traces/hard screenshots if present

## Data integrations
- The core dataset is bundled in `src/data/questions.json`.
- An alternate dataset is used by the `altdata` hosting/build mode (see README and `vite.config.ts`).

## Non-goals / explicit limitations

- No server-side auth/session/scoring is planned (statis site, client-only)
- Dataset contains correct answers (not tamper-resistant)
- CSP is build-time injected and intentionally not present in dev server
