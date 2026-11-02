import { answerAll, expect, expectScore, radio, startButton, startedQuiz, submitButton, test } from './fixtures';

function resumeButton(page: any) {
  return page.getByRole('button', { name: 'Resume Quiz' });
}

function startOverButton(page: any) {
  return page.getByRole('button', { name: 'Start Over' });
}

test.describe('refresh', () => {
  test('TS-20 reloading during an active quiz offers Resume and starts over, but does not auto-resume', async ({ page }) => {
    await startedQuiz(page);
    await radio(page, 0, 1).check();
    await page.reload();
    await expect(startButton(page)).toHaveCount(0);
    await expect(resumeButton(page)).toBeVisible();
    await expect(startOverButton(page)).toBeVisible();
    // still on start screen: no radios visible
    await expect(page.getByRole('radio')).toHaveCount(0);

    await resumeButton(page).click();
    await expect(page.locator('input:checked')).toHaveCount(1);
    await expect(page.getByText('1 of 10 answered')).toBeVisible();
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
