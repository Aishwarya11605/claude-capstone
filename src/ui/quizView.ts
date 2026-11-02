import { DURATION_MS } from '../config';
import type { Dataset, QuizState } from '../quiz/types';
import { createButton, createEl, createHeading, createPlaceholderBanner, type View } from './dom';
import { formatTime } from './format';

export interface QuizView extends View {
  update(state: QuizState, remainingMs: number): void;
}

export interface QuizViewHandlers {
  onElect: (questionId: string, optionId: string) => void;
  // Submit the quiz immediately without confirmation (used for timeout auto-submit).
  onSubmit: () => void;
}

export function createQuizView(dataset: Dataset, handlers: QuizViewHandlers): QuizView {
  const element = createEl('section', 'screen quiz-screen');
  const heading = createHeading(dataset.title);
  element.append(heading, createEl('p', 'time-limit', `Time limit: ${DURATION_MS / 60000} minutes`));
  if (dataset.isPlaceholder) element.append(createPlaceholderBanner());

  // Question navigation index
  const indexNav = createEl('nav', 'question-index');
  indexNav.append(createEl('p', 'question-index-label', 'Jump to question:'));
  const indexList = createEl('div', 'question-index-list');
  indexNav.append(indexList);

  const radios = new Map<string, Map<string, HTMLInputElement>>();
  const fieldsetsByQuestionId = new Map<string, HTMLFieldsetElement>();
  const list = createEl('div', 'questions');

  dataset.questions.forEach((question, index) => {
    const anchorId = `qq-${question.id}`;

    const indexLink = createEl('a', 'question-index-link') as HTMLAnchorElement;
    indexLink.href = `#${anchorId}`;
    indexLink.textContent = String(index + 1);
    indexLink.addEventListener('click', (e) => {
      // Use hash navigation so back/forward works for question jumps.
      e.preventDefault();
      location.hash = anchorId;
    });
    indexList.append(indexLink);

    const fieldset = createEl('fieldset', 'question') as HTMLFieldsetElement;
    fieldset.id = anchorId;
    fieldset.append(createEl('legend', 'question-text', `${index + 1}. ${question.text}`));

    const group = new Map<string, HTMLInputElement>();
    for (const option of question.options) {
      const label = createEl('label', 'option');
      const input = createEl('input');
      input.type = 'radio';
      input.name = question.id;
      input.value = option.id;
      input.addEventListener('change', () => handlers.onElect(question.id, option.id));
      group.set(option.id, input);
      label.append(input, createEl('span', 'option-text', option.text));
      fieldset.append(label);
    }
    radios.set(question.id, group);
    fieldsetsByQuestionId.set(question.id, fieldset);
    list.append(fieldset);
  });

  const timerText = createEl('span', 'timer', formatTime(DURATION_MS));
  timerText.setAttribute('role', 'timer');
  const answeredText = createEl('span', 'answered');
  const bar = createEl('div', 'bar');

  const submitBtn = createButton('Submit Quiz', 'button primary submit-button', () => {
    const answered = Number(submitBtn.dataset.answered ?? '0');
    const total = Number(submitBtn.dataset.total ?? '0');
    const unanswered = total - answered;
    // Auto-timeout submit must not be blocked, so confirm only in this manual click handler.
    if (unanswered > 0) {
      const message = `You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`;
      if (window.confirm(message)) handlers.onSubmit();
      return;
    }
    handlers.onSubmit();
  });

  bar.append(timerText, answeredText, submitBtn);
  element.append(indexNav, list, bar);

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

      const fieldset = fieldsetsByQuestionId.get(questionId);
      if (fieldset) fieldset.classList.toggle('answered', chosen]== undefined);
    }

    const answeredLabel = `${answered} of ${total} answered`;
    if (answeredText.textContent !== answeredLabel) answeredText.textContent = answeredLabel;

    // keep manual submit confirmation info up to date
    submitBtn.dataset.answered = String(answered);
    submitBtn.dataset.total = String(total);
  }

  return { element, heading, update };
}
