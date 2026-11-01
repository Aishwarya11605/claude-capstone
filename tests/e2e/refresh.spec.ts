import { answerAll, expect, expectScore, radio, startButton, startedQuiz, submitButton, test } from './fixtures';

test.describe('refresh', () => {
  test('TS-20 reloading during an active quiz returns to the Start screen with no restored state', async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 1).check();
    await page.reload();
    await expect(startButton(page)).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
    await startButton(page).click();
    await expect(page.locator('input:checked')).toHaveCount(0);
    await expect(page.getByText('0 of 10 answered')).toBeVisible();
  });

  test('TS-20 reloading on the Results screen returns to the Start screen', async ({ page }) => {
    await startedQuiz(page);
    await answerAll(page, 5);
    await submitButton(page).click();
    await expectScore(page, 5);
    await page.reload();
    await expect(startButton(page)).toBeVisible();
    await expect(page.getByText(/Your score/)).toHaveCount(0);
  });
});
