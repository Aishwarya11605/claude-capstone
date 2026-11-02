# Proposed Architecture (Planned Enhancements)

This document describes the target architecture to support the implementation plan approved for the repository.

The goal is to add delivery/quality capabilities (d/c/a11y/reliability) without changing the app's core deployment model (static site, no backend).

## Enhancements by category

### 1) Documentation as architecture artifacts

- Add requirements/acceptance-criteria docs and traceability to tests.
 - Impact: new `docs/` content only (no app code)

- No runtime behavior change.

### 2) CI (4-quality gates)

- Add GitHub Actions workflow to run: npm install -> typecheck -> lint -> Vitest -> build -> Playwright E2E.
  - Output artifacts: playwright report/media on failure.

- No runtime behavior change.

### 3) Playwright port robustness

- Current state: two Vite preview servers on fixed ports 4173/4174 with `--strictPort` - fail if ports are busy.
- Target state: ports are dynamic and/or configurable via env variables.

- Design principles:
  - Playwright utilizes `baseURL` from config (rather than hardcoded URLs in tests)
  - Avoid mechanical rely on both ports being free in CI

### 4) Accessibility coverage for Error screen
- Current state: error screen has a jsdom structural test only (README): no axe or contrast check.
- Target state: include Error screen in the same E2E a11y suite as other views.