import { TIMEOUT_NOTICE } from '../config';
import type { Dataset, Question, Result } from '../quiz/types';
import { createButton, createEl, createHeading, type View } from './dom';
import { formatTime } from './format';

function formatOptionText(question: Question, optionId: string | null): string {
  if (optionId === null) return 'Unanswered';
  const opt = question.options.find((o) => o.id === optionId);
  return opt ? opt.text : `Unknown option (${optionId})`;
}

export function createResultsView(
  dataset: Dataset,
  result: Result,
  onRestart: () => void,
): View {
  const element = createEl('section', 'screen results-screen');
  const heading = createHeading('Results');
  element.append(
    heading,
    createEl('p', 'score', `Your score: ${result.score} / ${result.total}`),
    createEl('p', 'remaining', `Time remaining at submit: ${formatTime(result.remainingMs)}`),
  );
  if (result.reason === 'timeout') element.append(createEl('p', 'timeout-notice', TIMEOUT_NOTICE));

  const review = createEl('section', 'results-review');
  review.append(createEl('h2', 'review-heading', 'Review your answers'));

  const list = createEl('ol', 'review-list') as HTMLOLElement;
  for (const [questionIndex, question] of dataset.questions.entries()) {
    const breakdown = result.breakdown.find((b) => b.questionId === question.id);
    const selectedId = breakdown?.selectedOptionId ?? null;
    const correctId = breakdown?.correctOptionId ?? question.correctOptionId;
    const isCorrect = selectedId !== null && selectedId === correctId;
    const item = createEl('li', isCorrect ? 'review-item correct' : 'review-item incorrect');

    item.append(
      createEl('h3', 'requestion-title', `${questionIndex + 1}. ${question.text}`),
      createEl(
        'p',
        'answer-selected',
        `You answered: ${formatOptionText(question, selectedId)}`,
      ),
      createEl(
        'p',
        'answer-correct',
        `Correct answer: ${formatOptionText(question, correctId)}`,
      ),
      createEl('p', 'answer-status', isCorrect ? 'Correct' : 'Incorrect'),
    );
    list.append(item);
  }

  review.append(list);
  element.append(review);

  element.append(createButton('Restart Quiz', 'button primary', onRestart));
  return { element, heading };
}
