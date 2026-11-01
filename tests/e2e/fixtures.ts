import { expect, test as base, type Locator, type Page } from '@playwright/test';

export const MAIN_URL = 'http://127.0.0.1:4173/';
export const ALT_URL = 'http://127.0.0.1:4174/';
export const START_TIME = Date.UTC(2026, 0, 15, 10, 0, 0);
export const QUIZ_MS = 300000;
export const QUESTION_COUNT = 10;
export const CORRECT_INDEXES = [0, 2, 1, 3, 0, 1, 2, 3, 1, 0];
export const ALT_CORRECT_INDEXES = [0, 3, 2, 1, 0, 3, 2, 1, 0, 3];

declare global {
  interface Window {
    __reportCsp: (message: string) => void;
  }
}

export const test = base.extend<{ cspViolations: string[] }>({
  cspViolations: [
    async ({ page }, use) => {
      const found: string[] = [];
      await page.exposeFunction('__reportCsp', (message: string) => {
        found.push(message);
      });
      await page.addInitScript(() => {
        document.addEventListener('securitypolicyviolation', (event) => {
          window.__reportCsp(`${event.violatedDirective} ${event.blockedURI}`);
        });
      });
      page.on('console', (message) => {
        if (message.type() === 'error' && /content security policy/i.test(message.text())) {
          found.push(message.text());
        }
      });
      await use(found);
      expect(found, 'CSP violations').toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function openQuiz(page: Page, url = MAIN_URL): Promise<void> {
  await page.clock.install({ time: START_TIME });
  await page.goto(url);
  await page.clock.pauseAt(START_TIME + 60000);
}

export function startButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Start Quiz' });
}

export function submitButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Submit Quiz' });
}

export function restartButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Restart Quiz' });
}

export function timer(page: Page): Locator {
  return page.getByRole('timer');
}

export async function startQuiz(page: Page): Promise<void> {
  await startButton(page).click();
  await expect(timer(page)).toHaveText('05:00');
}

export function questionBlocks(page: Page): Locator {
  return page.locator('fieldset');
}

export function radio(page: Page, question: number, option: number): Locator {
  return questionBlocks(page).nth(question).getByRole('radio').nth(option);
}

export async function questionTexts(page: Page): Promise<string[]> {
  return questionBlocks(page).locator('legend').allTextContents();
}

export async function answerAll(page: Page, correctCount: number, correctIndexes = CORRECT_INDEXES): Promise<void> {
  for (let q = 0; q < QUESTION_COUNT; q += 1) {
    const correct = correctIndexes[q];
    const index = q < correctCount ? correct : (correct + 1) % 4;
    await radio(page, q, index).check();
  }
}

export async function expectScore(page: Page, score: number): Promise<void> {
  await expect(page.getByText(`Your score: ${score} / ${QUESTION_COUNT}`)).toBeVisible();
}

export async function startedQuiz(page: Page, url = MAIN_URL): Promise<void> {
  await openQuiz(page, url);
  await startQuiz(page);
}
