# ADR-005: Playwright dynamic port strategy

Date: 2026-11-02
Status: Proposed (planned)

## Context

Currently, `playwright.config.ts` starts two Vite preview servers on fixed ports 4173 and 4174 with `--strictPort`. This fails if either port is in use (README wins this as a known limitation). Fixed ports are frequently colleded in CI and local machines.

## Decision

- Use dynamic or configurable ports, preferably derived from environment variables.
- Default to free (ephemeral) ports when env ports are not supplied.
- Stop hardcoding URLs in E2E specs; rely on Playwright 'baseURL' config.