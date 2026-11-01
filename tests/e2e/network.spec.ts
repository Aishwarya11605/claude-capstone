import {
  MAIN_URL,
  QUIZ_MS,
  answerAll,
  expect,
  expectScore,
  openQuiz,
  restartButton,
  startQuiz,
  startedQuiz,
  submitButton,
  test,
  timer,
} from './fixtures';

const PROBE_FORMS = [/^connect-src /, /refused to connect/i, /^Connecting to .*connect-src/i];

const isProbeViolation = (entry: string): boolean => PROBE_FORMS.some((form) => form.test(entry));

const ALLOWED_PATH = /^\/(assets\/[^/]+\.(js|css)|favicon\.svg)?$/;

test.describe('network, CSP and storage', () => {
  test('TS-16 the whole workflow makes only same-origin document, script, style and favicon requests', async ({ page }) => {
    const requests: string[] = [];
    page.on('request', (request) => requests.push(request.url()));
    await startedQuiz(page);
    await answerAll(page, 4);
    await submitButton(page).click();
    await expectScore(page, 4);
    await restartButton(page).click();
    await expect(timer(page)).toHaveText('05:00');
    await submitButton(page).click();
    await expectScore(page, 0);

    expect(requests.length).toBeGreaterThan(0);
    for (const url of requests) {
      const parsed = new URL(url);
      expect(parsed.origin, url).toBe(new URL(MAIN_URL).origin);
      expect(parsed.pathname, url).toMatch(ALLOWED_PATH);
    }
    expect(requests.some((url) => url.endsWith('.js'))).toBe(true);
  });

  test('TS-16 the CSP blocks a probe fetch', async ({ page, cspViolations }) => {
    await openQuiz(page);
    const outcome = await page.evaluate(() => fetch('./favicon.svg').then(() => 'allowed', () => 'blocked'));
    expect(outcome).toBe('blocked');
    for (const form of PROBE_FORMS) {
      await expect.poll(() => cspViolations.some((entry) => form.test(entry)), { message: String(form) }).toBe(true);
    }
    for (let i = cspViolations.length - 1; i >= 0; i -= 1) {
      if (isProbeViolation(cspViolations[i])) cspViolations.splice(i, 1);
    }
    expect(cspViolations, 'violations other than the expected connect-src probe').toEqual([]);
  });

  test('TS-16 nothing is written to browser storage', async ({ page, context }) => {
    await startedQuiz(page);
    await answerAll(page, 6);
    await submitButton(page).click();
    await expectScore(page, 6);
    await restartButton(page).click();
    await expect(timer(page)).toHaveText('05:00');
    const storage = await page.evaluate(async () => ({
      local: localStorage.length,
      session: sessionStorage.length,
      cookie: document.cookie,
      databases: (await indexedDB.databases()).length,
    }));
    expect(storage).toEqual({ local: 0, session: 0, cookie: '', databases: 0 });
    expect(await context.cookies()).toEqual([]);
  });

  test('AT-04 the full workflow including auto-submit works offline after load', async ({ page, context }) => {
    await openQuiz(page);
    await context.setOffline(true);
    await startQuiz(page);
    await answerAll(page, 8);
    await page.clock.fastForward(QUIZ_MS);
    await expectScore(page, 8);
    await expect(page.locator('.timeout-notice')).toBeVisible();
    await restartButton(page).click();
    await expect(timer(page)).toHaveText('05:00');
    await submitButton(page).click();
    await expectScore(page, 0);
  });
});
