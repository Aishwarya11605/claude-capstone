import {
  ALT_CORRECT_INDEXES,
  ALT_URL,
  QUESTION_COUNT,
  answerAll,
  expect,
  expectScore,
  openQuiz,
  questionTexts,
  startButton,
  startQuiz,
  submitButton,
  test,
} from './fixtures';

test.describe('datasets', () => {
  test('TS-18 the shipped build shows the placeholder banner and placeholder questions', async ({ page }) => {
    await openQuiz(page);
    await expect(page.getByText('Placeholder questions - sample content')).toBeVisible();
    await startButton(page).click();
    await expect(page.getByText('Placeholder questions - sample content')).toBeVisible();
    const texts = await questionTexts(page);
    expect(texts).toHaveLength(QUESTION_COUNT);
    expect(texts[0]).toBe('1. Placeholder question 1');
    expect(texts[QUESTION_COUNT - 1]).toBe(`${QUESTION_COUNT}. Placeholder question ${QUESTION_COUNT}`);
  });

  test('TS-18 the alternate build shows different questions and completes the full flow', async ({ page }) => {
    await openQuiz(page, ALT_URL);
    await expect(page.getByRole('heading', { name: 'Alternate Quiz' })).toBeVisible();
    await expect(page.getByText('Placeholder questions - sample content')).toHaveCount(0);
    await startQuiz(page);
    const texts = await questionTexts(page);
    expect(texts).toHaveLength(QUESTION_COUNT);
    for (const text of texts) expect(text).toContain('Alternate question');
    await answerAll(page, 6, ALT_CORRECT_INDEXES);
    await submitButton(page).click();
    await expectScore(page, 6);
  });
});
