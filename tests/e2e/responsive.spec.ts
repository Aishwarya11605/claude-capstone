import type { Page } from '@playwright/test';
import {
  ALT_URL,
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
  submitButton,
  test,
  timer,
} from './fixtures';

const SIZES = [
  { name: '360 px', width: 360, height: 740 },
  { name: '1280 px', width: 1280, height: 800 },
];

async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectInsideViewportWidth(page: Page, selector: string): Promise<void> {
  const width = page.viewportSize()?.width ?? 0;
  const boxes = await page.locator(selector).evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right };
    }),
  );
  expect(boxes.length).toBeGreaterThan(0);
  for (const box of boxes) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(width);
  }
}

async function box(page: Page, selector: string, which: 'first' | 'last') {
  const locator = page.locator(selector);
  const target = which === 'first' ? locator.first() : locator.last();
  const result = await target.boundingBox();
  if (!result) throw new Error(`no box for ${selector}`);
  return result;
}

test.describe('responsive layout', () => {
  for (const size of SIZES) {
    test(`TS-14 full flow at ${size.name}`, async ({ page }) => {
      await page.setViewportSize({ width: size.width, height: size.height });
      await openQuiz(page);
      await expectNoHorizontalScroll(page);
      await expect(startButton(page)).toBeInViewport();
      await startQuiz(page);
      await expectNoHorizontalScroll(page);
      await expectInsideViewportWidth(page, 'input[type="radio"], button, .timer');

      await answerAll(page, 5);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await expect(submitButton(page)).toBeInViewport({ ratio: 1 });
      await expect(timer(page)).toBeInViewport({ ratio: 1 });
      const bar = await box(page, '.bar', 'first');
      const submit = await submitButton(page).boundingBox();
      expect(submit).not.toBeNull();
      expect(submit!.y).toBeGreaterThanOrEqual(bar.y);
      expect(submit!.y + submit!.height).toBeLessThanOrEqual(bar.y + bar.height + 0.5);
      expect(submit!.height).toBeGreaterThanOrEqual(44);

      await page.evaluate(() => window.scrollTo(0, 0));
      expect(await page.evaluate(() => window.scrollY)).toBe(0);
      await questionBlocks(page).nth(0).getByRole('radio', { checked: true }).focus();
      await page.evaluate(() => window.scrollTo(0, 0));
      for (let step = 1; step < QUESTION_COUNT; step += 1) await page.keyboard.press('Tab');
      const lastChecked = questionBlocks(page).nth(QUESTION_COUNT - 1).getByRole('radio', { checked: true });
      await expect(lastChecked).toBeFocused();
      expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      const focusedBox = await lastChecked.boundingBox();
      const barAfterFocus = await box(page, '.bar', 'first');
      expect(focusedBox).not.toBeNull();
      expect(focusedBox!.y + focusedBox!.height).toBeLessThanOrEqual(barAfterFocus.y + 0.5);

      await submitButton(page).click();
      await expectScore(page, 5);
      await expectNoHorizontalScroll(page);
      await expect(restartButton(page)).toBeInViewport();
    });
  }

  test('AT-02 resizing from 1280 to 360 and back keeps selections and the timer', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await openQuiz(page);
    await startQuiz(page);
    await radio(page, 0, 1).check();
    await radio(page, 5, 3).check();
    await page.clock.runFor(10000);
    await expect(timer(page)).toHaveText('04:50');

    await page.setViewportSize({ width: 360, height: 740 });
    await expectNoHorizontalScroll(page);
    await expect(radio(page, 0, 1)).toBeChecked();
    await expect(radio(page, 5, 3)).toBeChecked();
    await expect(timer(page)).toHaveText('04:50');

    await page.setViewportSize({ width: 1280, height: 800 });
    await expectNoHorizontalScroll(page);
    await expect(radio(page, 0, 1)).toBeChecked();
    await expect(radio(page, 5, 3)).toBeChecked();
    await expect(page.getByText('2 of 10 answered')).toBeVisible();
    await page.clock.runFor(1000);
    await expect(timer(page)).toHaveText('04:49');
  });

  test('AT-03 very long text wraps at 360 px and controls stay usable', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await openQuiz(page, ALT_URL);
    await startQuiz(page);
    await expect(questionBlocks(page)).toHaveCount(QUESTION_COUNT);
    await expectNoHorizontalScroll(page);
    await expectInsideViewportWidth(page, 'input[type="radio"], legend, .option, .bar, button');
    await radio(page, 0, 0).check();
    await expect(radio(page, 0, 0)).toBeChecked();
    await expectNoHorizontalScroll(page);
    await submitButton(page).click();
    await expectScore(page, 1);
    await expectNoHorizontalScroll(page);
  });
});
