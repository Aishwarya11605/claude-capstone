import {
  QUESTION_COUNT,
  answerAll,
  expect,
  expectScore,
  openQuiz,
  questionBlocks,
  radio,
  restartButton,
  startButton,
  startQuiz,
  startedQuiz,
  submitButton,
  test,
  timer,
} from './fixtures';

test.describe('main workflow', () => {
  test('TS-01 start screen, 10 questions with options, timer counts down', async ({ page }) => {
    await openQuiz(page);
    await expect(startButton(page)).toBeVisible();
    await expect(startButton(page)).toBeEnabled();
    await startQuiz(page);
    await expect(questionBlocks(page)).toHaveCount(QUESTION_COUNT);
    for (let q = 0; q < QUESTION_COUNT; q += 1) {
      await expect(questionBlocks(page).nth(q).getByRole('radio')).toHaveCount(4);
    }
    await page.clock.runFor(1000);
    await expect(timer(page)).toHaveText('04:59');
  });

  test('TS-03 changing an answer keeps only the last choice and leaves other questions untouched', async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 0).check();
    await radio(page, 0, 2).check();
    await expect(radio(page, 0, 2)).toBeChecked();
    for (const option of [0, 1, 3]) await expect(radio(page, 0, option)).not.toBeChecked();
    for (let q = 1; q < QUESTION_COUNT; q += 1) {
      await expect(questionBlocks(page).nth(q).locator('input:checked')).toHaveCount(0);
    }
    await expect(page.getByText('1 of 10 answered')).toBeVisible();
  });

  test('TS-04 selections are retained while scrolling and the answered count is correct', async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 1).check();
    await radio(page, 4, 2).check();
    await radio(page, 9, 3).check();
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(radio(page, 0, 1)).toBeChecked();
    await expect(radio(page, 4, 2)).toBeChecked();
    await expect(radio(page, 9, 3)).toBeChecked();
    await expect(page.getByText('3 of 10 answered')).toBeVisible();
  });

  for (const correct of [0, 5, 10]) {
    test(`TS-06 manual submit with ${correct} correct answers shows ${correct} / 10`, async ({ page }) => {
      await startedQuiz(page);
      await answerAll(page, correct);
      await submitButton(page).click();
      await expectScore(page, correct);
    });
  }

  test('TS-07 all unanswered scores 0 / 10', async ({ page }) => {
    await startedQuiz(page);
    await submitButton(page).click();
    await expectScore(page, 0);
  });

  test('TS-07 a mix of correct, wrong and unanswered questions', async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 0).check();
    await radio(page, 1, 2).check();
    await radio(page, 2, 0).check();
    await submitButton(page).click();
    await expectScore(page, 2);
  });

  test('TS-11 results show the score, remaining time at submit and a Restart Quiz button', async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 0).check();
    await page.clock.runFor(19000);
    await expect(timer(page)).toHaveText('04:41');
    await submitButton(page).click();
    await expect(page.getByRole('heading', { name: 'Results' })).toBeFocused();
    await expectScore(page, 1);
    await expect(page.getByText('Time remaining at submit: 04:41')).toBeVisible();
    await expect(restartButton(page)).toBeVisible();
  });
});
