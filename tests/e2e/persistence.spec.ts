import { expect, openQuiz, radio, startButton, startedQuiz, submitButton, test, timer } from './fixtures';

const STORAGE_KEY = 'quiz.activeAttempt.v1';

function resumeButton(page: any) {
  return page.getByRole('button', { name: 'Resume Quiz' });
}

function startOverButton(page: any) {
  return page.getByRole('button', { name: 'Start Over' });
}

async function expectPageToBeIdleStartScreen(page: any): Promise<void> {
  // The start view is shown as a section with actions buttons,
  // but we avoid implementation-detail selectors and assert by role/name.
  await expect(resumeButton(page)).toBeVisible();
  await expect(startOverButton(page)).toBeVisible();
  // Onstart screen: question radios should not be rendered
  await expect(page.getByRole('radio')).toHaveCount(0);
}

function parseDeadline(raw: string): number {
  const parsed = JSON.parse(raw) as { deadlineEpochMs: number };
  return parsed.deadlineEpochMs;
}

test.describe('local persistence and resume', () => {
  test('PERT-01 reload during an active quiz shows Resume + restores answers and timer', async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 1).check();
    await radio(page, 1, 2).check();

    // Let time elapse to ensure deadline will produce less than full 5 minutes on resume.
    await page.clock.runFor(20_000);
    await expect(timer(page)).toHaveText('04:40');

    await page.reload();
    await expectPageToBeIdleStartScreen(page);

    await resumeButton(page).click();

    // Answers restored
    await expect(page.locator('input:checked')).toHaveCount(2);
    await expect(page.getByText('2 of 10 answered')).toBeVisible();

    // Absolute deadline continuity: timer should not reset to 05:00.
    const resumedTime = await timer(page).textContents();
    expect(resumedTime).not.toBe('05:00');
    // Accept both 04:39 and 04:40 depending on render/tick order.
    await expect(timer(page)).toHaveText(/^04:(39|40)$/);
  });

  test('PERT-02 Start Over clears persisted key and stays on start screen', async ({ page }) => {
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

  test('PERS-03 manual submit clears persisted attempt', async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 0).check();
    const savedBefore = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(savedBefore).toBeTypeOf('string');

    await submitButton(page).click();
    const savedAfter = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(savedAfter).toBeNull();
  });

  test('PERS-04 timeout auto-submit clears persisted attempt', async ({ page }) => {
    await openQuiz(page);
    await startButton(page).click();
    await radio(page, 0, 0).check();
    const savedBefore = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(savedBefore).toBeTypeOf('string');

    // Advance to the exact deadline (5 minutes). We rely on the playwright clock apis used in fixtures.
    await page.clock.runFor(300_000);

    const savedAfter = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(savedAfter).toBeNull();
  });

  test('PERS-05 corrupted storage payload shows a message and is cleared', async ({ page }) => {
    await openQuiz(page);
    await page.evaluate((k) => localStorage.setItem(k, '{'), STORAGE_KEY);
    await page.reload();
    await expect(page.getByText('A previously saved attempt could not be loaded and was cleared.')).toBeVisible();
    const v = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(v).toBeNull();
  });

  test('PERS-06 expired stored attempt is not resumable and is cleared', async ({ page }) => {
    // Make a valid persisted record first so the datasetSignature matches, then force the deadline into the past.
    await startedQuiz(page);
    await radio(page, 0, 0).check();
    const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(raw, saved attempt exists).toBeTypeOf('string');
    const deadline = parseDeadline(raw!);

    // Overwrite only the deadline to be expired, keeping schema and dataset signature intact.
    await page.evaluate((k) => {
      const existing = localStorage.getItem(k);
      if (!existing) return;
      const parsed = JSON.parse(existing);
      parsed.deadlineEpochMs = Date.now() - 1;
      localStorage.setItem(k, JSON.stringify(parsed));
    }, STORAGE_KEY);

    await page.reload();
    await expect(page.getByText(/has expired/)).toBeVisible();
    await expect(resumeButton(page)).toHaveCount(0);
    const v = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(v).toBeNull();
  });

  test('PERS-07 incompatible dataset signature clears at boot and shows message', async ({ page }) => {
    await openQuiz(page);
    // Pre-seed an attempt that is valid except for datasetSignature.
    await page.evaluate((k) => {
      localStorage.setItem(
        k,
        JSON.stringify({
          schemaVersion: 1,
          datasetSignature: 'incompatible-dataset',
          deadlineEpochMs: Date.now() + 300_000,
          answers: {},
        }),
      );
    }, STORAGE_KEY);

    await page.reload();
    await expect(page.getByText('A previously saved attempt is not compatible with the current quiz.')).toBeVisible();
    await expect(resumeButton(page)).toHaveCount(0);
    const v = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
    expect(v).toBeNull();
  });
});
