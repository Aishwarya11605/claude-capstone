# Quiz Web Application

A client-side, single-page quiz: 10 multiple-choice questions, a 5-minute countdown, automatic submission when time runs out, a score out of 10, and a Restart option. It is a static site (Vite + TypeScript, no framework, no backend). It ships with 10 placeholder questions that you replace with your own.

## Prerequisites

- Node.js 24 or later (see `.nvmrc`) and npm.
- Chromium for the end-to-end tests (installed through Playwright, see below).

## Commands

| Command | Purpose |
|---------|---------|
| `npm ci` | Install the exact versions from `package-lock.json`. |
| `npm run dev` | Start the Vite dev server (no CSP, for development only). |
| `npm run build` | Production build into `dist/` (adds the Content-Security-Policy meta tag). |
| `npm run preview` | Serve `dist/` locally (after `npm run build`). |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run lint` | ESLint (also forbids `innerHTML`, `outerHTML`, `insertAdjacentHTML` and `setAttribute('style', ...)`). |
| `npm test` | Vitest unit and component (jsdom) tests. Does not run Playwright specs. |
| `npm run test:coverage` | Same tests with a V8 coverage report in `coverage/` (no enforced threshold). |
| `npm run test:e2e` | Playwright tests (Chromium). Builds and serves two outputs itself, see below. |
| `npm run verify` | `typecheck`, `lint`, `test`, `build`, then `test:e2e`. |

First-time browser setup for the E2E tests: `npx playwright install chromium` (on Linux CI use `npx playwright install --with-deps chromium`).

If PowerShell blocks `npm.ps1` under its execution policy, use Git Bash or `cmd`.

## Continuous integration

A GitHub Actions CI workflow is intended to live at `.github/workflows/ci.yml` and run `npm run verify` on pull requests.

> Note: adding workflow files may require elevated GitHub token permissions (see PR notes).

## Project layout

```
index.html              page shell (no CSP in source; it is injected at build time)
public/favicon.svg
src/
  config.ts             constants (duration, question count, tick interval, thresholds)
  main.ts               bootstrap
  data/questions.json   the question dataset
  quiz/                 pure logic: types, validateDataset, scoring, quizMachine, timer, controller
  platform/clock.ts     clock, scheduler and visibility wrappers (injectable)
  ui/                   views (start, quiz, results, error), app shell, formatting
  styles/app.css
tests/
  unit/                 Vitest, pure logic with fake clocks (helpers/fakeClock.ts)
  component/            Vitest + jsdom, full UI flow and invalid datasets
  e2e/                  Playwright specs, fixtures.ts, fixtures/valid-alt.json
vite.config.ts          CSP plugin (build only) and the `altdata` mode
playwright.config.ts    builds and serves two outputs: dist on 4173, dist-alt on 4174
```

## Replacing the placeholder questions

Edit `src/data/questions.json`:

```
{
  "title": "My Quiz",
  "isPlaceholder": false,
  "questions": [
    {
      "id": "q1",
      "text": "Question text",
      "options": [
        { "id": "a", "text": "Option text" },
        { "id": "b", "text": "Option text" }
      ],
      "correctOptionId": "a"
    }
  ]
}
```

Rules, enforced at startup by `validateDataset`:

- `title` must be a non-empty string and `isPlaceholder` must be a boolean (`true` or `false`, not a string).
- Exactly 10 questions, shown in array order (no shuffling).
- Question ids unique and non-empty; question text non-empty.
- 2 to 6 options per question, option ids unique within the question, option text non-empty.
- `correctOptionId` must match exactly one option of that question.
- Set `isPlaceholder` to `false` to remove the "Placeholder questions - sample content" banner.

If the data is invalid the app shows "Quiz data is invalid" and no Start button; details go to the browser console.

Some E2E tests assert the placeholder text on port 4173. After replacing the questions, update `tests/e2e/dataset.spec.ts` and any spec that reads question text or correct answers. The alternate fixture `tests/e2e/fixtures/valid-alt.json` is only used by the `altdata` build.

## Deployment

Run `npm run build` and copy the contents of `dist/` to any static web host. Asset paths are relative, so sub-folders work. Opening `dist/index.html` through `file://` is not supported (module scripts and the CSP are designed for HTTP serving).

## Behaviour notes and limitations

- Client-side only: questions, correct answers, scoring and the timer all run in the browser. Answers can be found by anyone who inspects the page or its network payload. Do not use this for high-stakes or proctored assessment.
- Persistence: an in-progress attempt is persisted to `localStorage` to enable **Resume** after reload. The app saves selected answers and an **absolute** timer deadline. Saved data is versioned with a schema version and invalidated if the quiz dataset changes.
- Content-Security-Policy: the production build contains a meta tag (`default-src 'self'; ... connect-src 'none'; ...`). The dev server and the source `index.html` do not, so CSP behaviour is only tested against built output.
- Timer rule: the elapsed time is the larger of the monotonic clock change and the wall-clock change since Start, and it never goes backwards. Consequences:
  - Moving the system clock backwards does not give extra time.
  - Moving the system clock forwards (or a device that sleeps, then wakes with the wall clock advanced) shortens the quiz or ends it immediately.
- Hidden or throttled tabs: browsers slow timers in background tabs, so the automatic submission can happen late (up to about a minute). On returning to the tab, a `visibilitychange` recompute submits at once if the deadline has passed. The score uses the selections made before the deadline, and answers after the deadline are not counted.
- Accessibility: target is WCAG 2.1 AA. Checked with axe (Start, Quiz and Results screens) and keyboard-only E2E tests. The Error screen has only a jsdom structural test (alert role, no Start button); it has no axe or contrast check. The fixed 5-minute limit relies on the essential-time-limit exception of SC 2.2.1. No formal audit has been done.
- Browsers: E2E tests run in Chromium only.

## Test layout

- `tests/unit` and `tests/component`: logic, timer, controller, dataset validation, the real visibility adapter (`realVisibility`), UI flow and teardown, invalid datasets, and the `main.ts` bootstrap error path (`main.test.ts`).
- `tests/e2e`: `workflow`, `timer`, `restart`, `responsive`, `a11y`, `network`, `dataset`, `refresh`, `noscript`, `smoke`. Every spec fails on any CSP violation.
- Supplementary scenarios: AT-01 clock change (`timer`), AT-02 resize (`responsive`), AT-03 long text (`responsive`, port 4174), AT-04 offline (`network`), AT-05 focus not hidden by the sticky bar (`a11y`), AT-06 CSP violation guard (`fixtures.ts`, all specs), AT-07 to AT-09 announcements and deadline edge cases (`controller`, `timer` unit tests), AT-10 JavaScript disabled (`noscript`).
- `npm run test:e2e` runs exactly two builds (`dist/` and `dist-alt/`) and two preview servers (ports 4173 and 4174, `--strictPort`) and stops them when finished. Both ports must be free.
