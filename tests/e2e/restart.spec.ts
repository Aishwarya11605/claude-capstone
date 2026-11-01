import {
  QUESTION_COUNT,
  answerAll,
  expect,
  expectScore,
  questionBlocks,
  questionTexts,
  radio,
  restartButton,
  startedQuiz,
  submitButton,
  test,
  timer,
} from './fixtures';

const DATASET_ORDER = Array.from({ length: QUESTION_COUNT }, (_, i) => `${i + 1}. Placeholder question ${i + 1}`);

test.describe('restart', () => {
  test('TS-02 question order is the dataset order in every attempt', async ({ page }) => {
    await startedQuiz(page);
    expect(await questionTexts(page)).toEqual(DATASET_ORDER);
    await submitButton(page).click();
    await restartButton(page).click();
    expect(await questionTexts(page)).toEqual(DATASET_ORDER);
    await submitButton(page).click();
    await restartButton(page).click();
    expect(await questionTexts(page)).toEqual(DATASET_ORDER);
  });

  test('TS-12 a restarted attempt is clean and its timer runs from 05:00', async ({ page }) => {
    await startedQuiz(page);
    await answerAll(page, 10);
    await page.clock.runFor(30000);
    await expect(timer(page)).toHaveText('04:30');
    await submitButton(page).click();
    await expectScore(page, 10);
    await restartButton(page).click();
    await expect(questionBlocks(page)).toHaveCount(QUESTION_COUNT);
    await expect(page.locator('input:checked')).toHaveCount(0);
    await expect(page.getByText('0 of 10 answered')).toBeVisible();
    await expect(page.getByText(/Your score/)).toHaveCount(0);
    await expect(timer(page)).toHaveText('05:00');
    await page.clock.runFor(1000);
    await expect(timer(page)).toHaveText('04:59');
  });

  test('TS-13 only the current attempt is scored', async ({ page }) => {
    await startedQuiz(page);
    await answerAll(page, 7);
    await submitButton(page).click();
    await expectScore(page, 7);
    await restartButton(page).click();
    await answerAll(page, 3);
    await submitButton(page).click();
    await expectScore(page, 3);
  });

  test('EC-06 a rapid double click on Restart gives one attempt with one timer', async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 0).check();
    await submitButton(page).click();
    await page.evaluate(() => {
      const button = [...document.querySelectorAll('button')].find((b) => b.textContent === 'Restart Quiz');
      button?.click();
      button?.click();
    });
    await expect(questionBlocks(page)).toHaveCount(QUESTION_COUNT);
    await expect(page.locator('input:checked')).toHaveCount(0);
    await expect(timer(page)).toHaveText('05:00');
    await page.clock.runFor(1000);
    await expect(timer(page)).toHaveText('04:59');
    await page.clock.runFor(2000);
    await expect(timer(page)).toHaveText('04:57');
  });
});
