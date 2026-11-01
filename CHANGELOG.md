# Changelog

All notable changes to this project are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] - Unreleased (2026-10-24)

Initial version. Not tagged or released: the workspace is not a Git repository and no commit, push or release has been made.

### Added

- Single-page, client-side quiz (Vite + TypeScript, vanilla DOM, no runtime dependencies, no backend).
- Start screen with a Start Quiz button; a quiz screen with 10 multiple-choice questions in fixed dataset order; one changeable answer per question; selections retained until submit or restart.
- 5-minute countdown shown as mm:ss, starting at 05:00. The remaining time is computed from the larger of the monotonic and wall-clock elapsed time and never increases. Announcements at 1 minute and 30 seconds remaining.
- Automatic submission when time reaches zero, and a Submit Quiz button. Submission is evaluated exactly once; the timer stops and answers are locked afterwards.
- Results screen with the score out of 10 (one point per correct answer, unanswered counts as 0), the time remaining at submit, and a notice when the quiz was submitted automatically.
- Restart Quiz: a fresh attempt with cleared answers, a new 05:00 timer, the same question order, and no carry-over of the previous score.
- Question dataset in one replaceable file, `src/data/questions.json`, with 10 placeholder questions and a visible placeholder banner (controlled by `isPlaceholder`). The dataset is validated at startup (exactly 10 questions, unique ids, 2 to 6 options, a valid `correctOptionId`, non-empty `title`, boolean `isPlaceholder`); invalid data shows an error screen with no Start button.
- Responsive layout (checked at 360 px and 1280 px), sticky bottom bar with timer, answered count and Submit, keyboard-operable native controls, visible focus, selected, hover and disabled styles (the disabled style is CSS only; the app never disables a control), `<noscript>` notice, favicon.
- Tests: 133 unit and component tests in 13 files (Vitest, jsdom) and 46 Playwright end-to-end tests (Chromium) including axe accessibility checks; unit and component coverage 95.80% statements, 90.64% branches, 88.23% functions, 96.63% lines.
- Tooling: ESLint (including rules that forbid `innerHTML`, `outerHTML`, `insertAdjacentHTML` and `setAttribute('style', ...)`), TypeScript strict typecheck, pinned exact dependency versions, `npm run verify`, Node 24 (`.nvmrc`), README with commands, CI sequence and instructions for replacing the questions.

### Security

- Production builds carry a Content-Security-Policy meta tag: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'none'; base-uri 'none'; form-action 'none'`. It is injected at build time only and is absent from the source `index.html` and the dev server.
- No network requests beyond same-origin document, script, style and favicon; no cookies, `localStorage`, `sessionStorage` or IndexedDB; no personal data collected.
- All dataset text is rendered with `textContent`; no `innerHTML`, `eval` or inline styles in `src/`.
- All dependencies are pinned to exact versions; a clean `npm ci` reported 0 vulnerabilities (user-run, 2026-10-24).

### Known limitations

- Tested in Chromium only; no Firefox, WebKit, real-device or screen-reader testing. Accessibility evidence is axe (WCAG 2.0/2.1 A and AA rules) plus keyboard tests; no formal audit.
- The Error screen is tested in jsdom only; WCAG SC 2.2.1 (time limit) is handled as a documented essential-time-limit exception, not tested.
- Questions, answers, scoring and timer run in the browser and can be inspected or tampered with; not for high-stakes use.
- A forward system-clock change can end the quiz early; a background tab may auto-submit up to about a minute late.
- No persistence: refreshing the page returns to the Start screen and loses the attempt.
- The 10 questions are placeholders, and several end-to-end specs depend on the placeholder content.
- Optional hardening NF-02 (`dispose()` leaves the controller callable) is not applied; it is not reachable in production.
- Opening `dist/index.html` through `file://` is not supported.
