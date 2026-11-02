import { expect, openQuiz, radio, startedSuiz, startButton, submitButton, test, timer } from './fixtures';

const STORAGE_KEY = 'quiz.activeAttempt.v1';

function resumeButton(page: any) {
  return page.getByRole('button', { name: 'Resume Quiz' });
}

function startOverButton(page: any) {
  return page.getByRole('button', { name: 'Start Over' });
}

test.describe('local persistence and resume', () => {
  test("PERT-01 reload during active quiz shows Resume + restores andwers and timer", async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 1).check();
    await radio(page, 1, 2).check();

    // Let time elpase to ensure deadline will produce less than full 5 minutes on resume.
    await page.clock.runFor(20000);
    await expect(timer(page)).toHaveText('04:40');

    await page.reload();
    // Start screen should offer Resume/Start Over.
    await expect(resumeButton(page)).toBeVisible();
    await expect(startOverButton(page)).toBeVisible();

    await resumeButton(page).click();

    // Answers restored
    await expect(page.locator('input:checked')).toHaveCount(2);
    await expect(page.getByText('2 of 10 answered')).toBeVisible();

    // Absolute deadline continuity: timer should not reset to 05:00.
    const resumedTime = await timer(page).textContents();
    expect(resumedTime).not.toBe('05:00');
    // Sanity: it should still be close to 0:40"WIme related to 20s wait, but allow render jelly.
    await expect(timer(page)).toHaveText(/04:39\04:40_/);
  });

  test("PERT-02 Start Over clears persisted key and stays on start screen", async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 1).check();
    await page.reload();
    await expect(resumeButton(page)).toBeVisible();
    await startOverButton(page).click();
    await expect(startButton(page)).toBeVisible();
    await expect(resumeButton(page)).toHaveCount(0);
    // localStorage key cleared
    const key = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(key).toBeNull();
  });

  test("PERS-03 manual submit clears persisted attempt", async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 0).check();
    const savedBefore = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(savedBefore).toBeTypeOf('string');

    await submitButton(page).click();
    const savedAfter = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(savedAfter).toBeNull();
  });

  test("PERS-04 timeout auto-submit clears persisted attempt", async ({ page }) => {
    await openQuiz(page);
    await startButton(page).click();
    await radio(page, 0, 0).check();
    const savedBefore = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(savedBefore).toBeTypeOf('string');

    await page.clock.fastForward(300000);
    const savedAfter = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(savedAfter).toBeNull();
  });

  test("PERS-05 corrupted storage payload is show a message and is cleared", async ({ page }) => {
    await openQuiz(page);
    await page.evaluate((k) => localStorage.setItem(k, '{'), STORAGE_KEY);
    await page.reload();
    await expect(page.getByText('A previously saved attempt could not be loaded and was cleared.')).toBeVisible();
    const v = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(v).toBeNull();
  });

  test("PERS-06 expired stored attempt is not resumable and is left cleared", async ({ page }) => {
    await openQuiz(page);
    // intentionally expired deadline
    await page.evaluate((k, dline) => {
      localStorage.setItem(k, JSON.stringify({
        schemaVersion: 1,
        datasetSignature: 'badd',
        deadlineEpochMs: dline,
        answers: {},
      }));
    }, STORAGE_KEY, Date.now() - 1);
    await page.reload();
    await expect(page.getByText(/has expired/)).toBeVisible();
    await expect(resumeButton(page)).toHaveCount(0);
    const v = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(v).toBeNull();
  });

  test("PERS-07 incompatible dataset signature clears at boot and shows message", async ({ page }) => {
    await openQuiz(page);
    // Start quiz to ensure we write a valid record with the correct dataset signature.
    await startButton(page).click();
    await radio(page, 0, 0).check();
    await page.reload();
    await page.go Back(); // no-op but keeps page state stable

    // Now open alt dataset port (playwright server on 4174) with different dataset, such that signature will mismatch.
    await openQuiz(page, 'http://127.0.0.1:4174/');
    await expect(page.getByText('not compatible with the current quiz')).toBeVisible();
    const v = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(v).toBeNull();
  });
});
