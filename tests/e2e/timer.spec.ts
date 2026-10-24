import {
  QUIZ_MS,
  answerAll,
  expect,
  expectScore,
  radio,
  startedQuiz,
  submitButton,
  test,
  timer,
} from './fixtures';
import type { Page } from '@playwright/test';

const TIMEOUT_NOTICE = 'Time is up - your quiz was submitted automatically';

function resultsHeadings(page: Page) {
  return page.getByRole('heading', { name: 'Results' });
}

function timeoutNotice(page: Page) {
  return page.locator('.timeout-notice').filter({ hasText: TIMEOUT_NOTICE });
}

test.describe('timer, expiry and races', () => {
  test('TS-05 the display counts down 04:59, 04:30, 00:01', async ({ page }) => {
    await startedQuiz(page);
    await page.clock.runFor(1000);
    await expect(timer(page)).toHaveText('04:59');
    await page.clock.runFor(29000);
    await expect(timer(page)).toHaveText('04:30');
    await page.clock.runFor(269000);
    await expect(timer(page)).toHaveText('00:01');
  });

  test('TS-08 expiry auto-submits with the selections at the deadline and a timeout notice', async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 0).check();
    await radio(page, 1, 2).check();
    await radio(page, 2, 3).check();
    await page.clock.fastForward(QUIZ_MS);
    await expect(resultsHeadings(page)).toHaveCount(1);
    await expectScore(page, 2);
    await expect(timeoutNotice(page)).toBeVisible();
    await expect(page.getByText('Time remaining at submit: 00:00')).toBeVisible();
  });

  test('TS-09 double-click on Submit gives exactly one results screen', async ({ page }) => {
    await startedQuiz(page);
    await answerAll(page, 4);
    await submitButton(page).dblclick();
    await expect(resultsHeadings(page)).toHaveCount(1);
    await expectScore(page, 4);
  });

  test('TS-09 two synchronous clicks on Submit are evaluated once', async ({ page }) => {
    await startedQuiz(page);
    await answerAll(page, 6);
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Submit Quiz');
      button?.click();
      button?.click();
    });
    await expect(resultsHeadings(page)).toHaveCount(1);
    await expectScore(page, 6);
    await expect(timeoutNotice(page)).toHaveCount(0);
  });

  test('TS-09 clicking Submit just before the deadline gives one manual result and no later timeout', async ({ page }) => {
    await startedQuiz(page);
    await answerAll(page, 3);
    await page.clock.runFor(299900);
    await expect(timer(page)).toHaveText('00:01');
    await submitButton(page).click();
    await expect(resultsHeadings(page)).toHaveCount(1);
    await expectScore(page, 3);
    await page.clock.runFor(5000);
    await expect(resultsHeadings(page)).toHaveCount(1);
    await expect(timeoutNotice(page)).toHaveCount(0);
    await expectScore(page, 3);
  });

  test('TS-10 after submit there are no answer controls and fast-forwarding changes nothing', async ({ page }) => {
    await startedQuiz(page);
    await answerAll(page, 7);
    await page.clock.runFor(12000);
    await submitButton(page).click();
    await expectScore(page, 7);
    await expect(page.getByText('Time remaining at submit: 04:48')).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
    await expect(submitButton(page)).toHaveCount(0);
    await page.clock.fastForward(QUIZ_MS);
    await expectScore(page, 7);
    await expect(page.getByText('Time remaining at submit: 04:48')).toBeVisible();
    await expect(timeoutNotice(page)).toHaveCount(0);
    await expect(resultsHeadings(page)).toHaveCount(1);
  });

  test('TS-19 an expiry that passes while the tab is hidden is submitted by the visibilitychange wiring, once', async ({ page }) => {
    await startedQuiz(page);
    await answerAll(page, 5);
    await page.evaluate((jumpMs) => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      const dateNow = Date.now.bind(Date);
      const perfNow = performance.now.bind(performance);
      Date.now = () => dateNow() + jumpMs;
      performance.now = () => perfNow() + jumpMs;
    }, QUIZ_MS + 10000);
    await expect(resultsHeadings(page)).toHaveCount(0);
    await expect(timer(page)).toHaveText('05:00');
    await expect(timeoutNotice(page)).toHaveCount(0);
    await page.evaluate(() => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await expect(resultsHeadings(page)).toHaveCount(1);
    await expectScore(page, 5);
    await expect(timeoutNotice(page)).toBeVisible();
    await expect(page.getByText('Time remaining at submit: 00:00')).toBeVisible();
  });

  test('AT-01 setting the system clock backwards does not change the displayed time', async ({ page }) => {
    await startedQuiz(page);
    await page.clock.runFor(10000);
    await expect(timer(page)).toHaveText('04:50');
    await page.clock.setSystemTime(new Date(Date.UTC(2026, 0, 15, 8, 0, 0)));
    await page.clock.runFor(1000);
    await expect(timer(page)).toHaveText('04:49');
    await page.clock.runFor(1000);
    await expect(timer(page)).toHaveText('04:48');
  });
});
