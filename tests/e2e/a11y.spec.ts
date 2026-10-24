import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import {
  CORRECT_INDEXES,
  MAIN_URL,
  QUESTION_COUNT,
  expect,
  expectScore,
  questionBlocks,
  restartButton,
  startButton,
  submitButton,
  test,
} from './fixtures';

const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];
const LETTERS = ['A', 'B', 'C', 'D'];

async function expectNoAxeViolations(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

async function openStart(page: Page): Promise<void> {
  await page.goto(MAIN_URL);
  await expect(startButton(page)).toBeVisible();
}

async function startWithKeyboard(page: Page): Promise<void> {
  await page.keyboard.press('Tab');
  await expect(startButton(page)).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('timer')).toBeVisible();
}

test.describe('accessibility', () => {
  test('TS-15 axe finds no WCAG A/AA violations on Start, Quiz and Results', async ({ page }) => {
    await openStart(page);
    await expectNoAxeViolations(page);
    await startButton(page).click();
    await expectNoAxeViolations(page);
    await page.locator('fieldset').nth(0).getByRole('radio').nth(1).check();
    await expectNoAxeViolations(page);
    await submitButton(page).click();
    await expect(restartButton(page)).toBeVisible();
    await expectNoAxeViolations(page);
  });

  test('TS-15 controls have accessible names', async ({ page }) => {
    await openStart(page);
    await expect(startButton(page)).toBeVisible();
    await startButton(page).click();
    for (let q = 1; q <= QUESTION_COUNT; q += 1) {
      const group = page.getByRole('group', { name: `${q}. Placeholder question ${q}` });
      await expect(group).toHaveCount(1);
      for (const letter of LETTERS) {
        await expect(group.getByRole('radio', { name: `Placeholder option ${letter} for question ${q}` })).toHaveCount(1);
      }
    }
    await expect(submitButton(page)).toBeVisible();
    await submitButton(page).click();
    await expect(restartButton(page)).toBeVisible();
  });

  test('TS-15 selecting an option does not change its accessible name and keeps a non-colour cue', async ({ page }) => {
    await openStart(page);
    await startButton(page).click();
    const group = page.getByRole('group', { name: '1. Placeholder question 1' });
    const chosen = group.getByRole('radio').nth(1);
    const other = group.getByRole('radio').nth(2);
    const chosenName = 'Placeholder option B for question 1';
    const otherName = 'Placeholder option C for question 1';
    await expect(chosen).toHaveAccessibleName(chosenName);
    await expect(other).toHaveAccessibleName(otherName);
    await chosen.check();
    await expect(chosen).toBeChecked();
    await expect(chosen).toHaveAccessibleName(chosenName);
    await expect(other).toHaveAccessibleName(otherName);
    await other.check();
    await expect(other).toHaveAccessibleName(otherName);
    await expect(chosen).toHaveAccessibleName(chosenName);
    const mark = await other.evaluate((input) => {
      const text = input.closest('label')!.querySelector('.option-text')!;
      return getComputedStyle(text, '::before').content;
    });
    expect(mark).toContain('✓');
  });

  test('TS-15 the whole quiz can be completed with the keyboard and Submit is the last tab stop', async ({ page }) => {
    await openStart(page);
    await startWithKeyboard(page);
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused();
    for (let q = 0; q < QUESTION_COUNT; q += 1) {
      await page.keyboard.press('Tab');
      const target = CORRECT_INDEXES[q];
      if (target === 0) await page.keyboard.press('Space');
      for (let step = 0; step < target; step += 1) await page.keyboard.press('ArrowDown');
      await expect(questionBlocks(page).nth(q).getByRole('radio').nth(target)).toBeChecked();
    }
    await page.keyboard.press('Tab');
    await expect(submitButton(page)).toBeFocused();
    const lastFocusable = await page.evaluate(() => {
      const focusable = [...document.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]')].filter(
        (element) => element.tabIndex >= 0,
      );
      return focusable[focusable.length - 1]?.textContent;
    });
    expect(lastFocusable).toBe('Submit Quiz');
    const outline = await submitButton(page).evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: style.outlineWidth };
    });
    expect(outline.style).not.toBe('none');
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(3);
    await page.keyboard.press('Enter');
    await expectScore(page, QUESTION_COUNT);
    await expect(page.getByRole('heading', { name: 'Results' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(restartButton(page)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('timer')).toHaveText('05:00');
  });

  test('TS-15 a focused radio has a visible focus indicator', async ({ page }) => {
    await openStart(page);
    await startWithKeyboard(page);
    await page.keyboard.press('Tab');
    const radio = questionBlocks(page).nth(0).getByRole('radio').nth(0);
    await expect(radio).toBeFocused();
    const outline = await radio.evaluate((element) => {
      const style = getComputedStyle(element);
      return { style: style.outlineStyle, width: style.outlineWidth };
    });
    expect(outline.style).not.toBe('none');
    expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(3);
  });

  test('NFR-05 hovering an unselected option changes its background', async ({ page }) => {
    await openStart(page);
    await startButton(page).click();
    const label = questionBlocks(page).nth(0).getByRole('radio').nth(1).locator('xpath=ancestor::label');
    await page.mouse.move(0, 0);
    const before = await label.evaluate((element) => getComputedStyle(element).backgroundColor);
    await label.hover();
    const hovered = await label.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(hovered).not.toBe(before);
    await page.mouse.move(0, 0);
    const after = await label.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(after).toBe(before);
  });

  test('NFR-05 hovering Start, Submit and Restart changes the button background', async ({ page }) => {
    const background = (locator: ReturnType<typeof startButton>) =>
      locator.evaluate((element) => getComputedStyle(element).backgroundColor);
    const expectHoverChange = async (locator: ReturnType<typeof startButton>) => {
      await page.mouse.move(0, 0);
      const before = await background(locator);
      await locator.hover();
      const hovered = await background(locator);
      expect(hovered).not.toBe(before);
      await page.mouse.move(0, 0);
      expect(await background(locator)).toBe(before);
    };
    await openStart(page);
    await expectHoverChange(startButton(page));
    await startButton(page).click();
    await expectHoverChange(submitButton(page));
    await submitButton(page).click();
    await expect(restartButton(page)).toBeVisible();
    await expectHoverChange(restartButton(page));
  });

  test('NFR-05 a disabled button is visually distinct from an enabled one', async ({ page }) => {
    await openStart(page);
    await startButton(page).click();
    const submit = submitButton(page);
    await page.mouse.move(0, 0);
    const read = () =>
      submit.evaluate((element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, color: style.color, border: style.borderTopColor, cursor: style.cursor };
      });
    const enabled = await read();
    expect(enabled.cursor).toBe('pointer');
    await submit.evaluate((element) => {
      (element as HTMLButtonElement).disabled = true;
    });
    await expect(submit).toBeDisabled();
    const disabled = await read();
    expect(disabled.background).not.toBe(enabled.background);
    expect(disabled.color).not.toBe(enabled.color);
    expect(disabled.border).not.toBe(enabled.border);
    expect(disabled.cursor).toBe('not-allowed');
  });

  for (const size of [
    { width: 360, height: 740 },
    { width: 1280, height: 800 },
  ]) {
    test(`AT-05 a focused radio is not hidden by the sticky bar at ${size.width} px`, async ({ page }) => {
      await page.setViewportSize(size);
      await openStart(page);
      await startWithKeyboard(page);
      for (let q = 0; q < QUESTION_COUNT; q += 1) {
        await page.keyboard.press('Tab');
        const geometry = await page.evaluate(() => {
          const focused = document.activeElement as HTMLElement;
          const rect = focused.getBoundingClientRect();
          const bar = document.querySelector('.bar')!.getBoundingClientRect();
          return {
            tag: focused.tagName,
            top: rect.top,
            bottom: rect.bottom,
            left: rect.left,
            right: rect.right,
            barTop: bar.top,
            barBottom: bar.bottom,
            viewportHeight: window.innerHeight,
            viewportWidth: window.innerWidth,
          };
        });
        expect(geometry.tag).toBe('INPUT');
        expect(geometry.top).toBeGreaterThanOrEqual(0);
        expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
        expect(geometry.left).toBeGreaterThanOrEqual(0);
        expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
        const overlapsBar = geometry.bottom > geometry.barTop && geometry.top < geometry.barBottom;
        expect(overlapsBar, `question ${q + 1} focused radio overlaps the sticky bar`).toBe(false);
        await page.keyboard.press('Space');
      }
    });
  }
});
