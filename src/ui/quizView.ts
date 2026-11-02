import { DURATION_MS } from '../config';
import type { Dataset, QuizState } from '../quiz/types';
import { createButton, createEl, createHeading, createPlaceholderBanner, type View } from './dom';
import { formatTime } from './format';

export interface QuizView extends View {
  update(state: QuizState, remainingMs: number): void;
}

export interface QuizViewHandlers {
  onSelect: (questionId: string, optionId: string) => void;
  onSubmit: () => void;
}

export function createQuizView(dataset: Dataset, handlers: QuizViewHandlers): QuizView {
  const element = createEl('section', 'screen quiz-screen');
  const heading = createHeading(dataset.title);
  element.append(heading, createEl('p', 'time-limit', `Time limit: ${DURATION_MS / 60000} minutes`));
  if (dataset.isPlaceholder) element.append(createPlaceholderBanner());

  const radios = new Map<string, Map<string, HTMLInputElement>>();
  const list = createEl('div', 'questions');
  dataset.questions.forEach((question, index) => {
    const fieldset = createEl('fieldset', 'question');
    fieldset.append(createEl('legend', 'question-text', `${index + 1}. ${question.text}`));
    const group = new Map<string, HTMLInputElement>();
    for (const option of question.options) {
      const label = createEl('label', 'option');
      const input = createEl('input');
      input.type = 'radio';
      input.name = question.id;
      input.value = option.id;
      input.addEventListener('change', () => handlers.onSelect(question.id, option.id));
      group.set(option.id, input);
      label.append(input, createEl('span', 'option-text', option.text));
      fieldset.append(label);
    }
    radios.set(question.id, group);
    list.append(fieldset);
  });

  const timerText = createEl('span', 'timer', formatTime(DURATION_MS));
  timerText.setAttribute('role', 'timer');
  const answeredText = createEl('span', 'answered');
  const bar = createEl('div', 'bar');
  bar.append(timerText, answeredText, createButton('Submit Quiz', 'button primary submit-button', handlers.onSubmit));
  element.append(list, bar);

  const total = dataset.questions.length;

  function update(state: QuizState, remainingMs: number): void {
    const time = formatTime(remainingMs);
    if (timerText.textContent !== time) timerText.textContent = time;
    let answered = 0;
    for (const [questionId, group] of radios) {
      const chosen = state.answers[questionId];
      if (chosen !== undefined) answered += 1;
      for (const [optionId, input] of group) {
        const shouldCheck = optionId === chosen;
        if (input.checked !== shouldCheck) input.checked = shouldCheck;
      }
    }
    const answeredLabel = `${answered} of ${total} answered`;
    if (answeredText.textContent !== answeredLabel) answeredText.textContent = answeredLabel;
  }

  return { element, heading, update };
}
