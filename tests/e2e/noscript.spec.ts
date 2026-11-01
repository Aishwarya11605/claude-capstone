import { MAIN_URL, expect, test } from './fixtures';

test.describe('JavaScript disabled', () => {
  test.use({ javaScriptEnabled: false });

  test('AT-10 the noscript message is shown', async ({ page }) => {
    await page.goto(MAIN_URL);
    const noscript = page.locator('noscript');
    const message = await noscript.evaluate((element) => ({
      text: element.textContent,
      display: getComputedStyle(element).display,
      height: element.getBoundingClientRect().height,
    }));
    expect(message.text).toContain('This quiz needs JavaScript');
    expect(message.display).not.toBe('none');
    expect(message.height).toBeGreaterThan(0);
    await expect(page.locator('#app')).toBeEmpty();
    await expect(page.getByRole('button', { name: 'Start Quiz' })).toHaveCount(0);
  });
});
