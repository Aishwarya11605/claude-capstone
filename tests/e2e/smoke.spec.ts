import { ALT_URL, MAIN_URL, expect, openQuiz, startButton, test } from './fixtures';

for (const [name, url] of [
  ['main build (4173)', MAIN_URL],
  ['alternate build (4174)', ALT_URL],
] as const) {
  test(`serves the start screen from the ${name}`, async ({ page }) => {
    await openQuiz(page, url);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(startButton(page)).toBeEnabled();
  });
}
