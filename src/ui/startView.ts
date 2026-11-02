import { DURATION_MS, QUESTION_COUNT } from '../config';
import type { Dataset } from '../quiz/types';
import { createButton, createEl, createHeading, createPlaceholderBanner, type View } from './dom';

export interface StartViewHandlers {
  onStart: () => void;
  onResume: () => void;
  onStartOver: () => void;
}

export interface StartViewOptions {
  showResume: boolean;
  // optional informational message when a prior attempt can't be resumed
  resumeMessage?: string;
}

export function createStartView(
  dataset: Dataset,
  handlers: StartViewHandlers,
  options: StartViewOptions,
): View {
  const element = createEl('section', 'screen start-screen');
  const heading = createHeading(dataset.title);
  element.append(heading);
  if (dataset.isPlaceholder) element.append(createPlaceholderBanner());
  const minutes = DURATION_MS / 60000;

  element.append(createEl('p', undefined, `${QUESTION_COUNT} questions, ${minutes} minutes`));

  if (options.resumeMessage) {
    element.append(createEl('p', 'resume-message', options.resumeMessage));
  }

  if (options.showResume) {
    const actions = createEl('div', 'start-actions');
    actions.append(
      createButton('Resume Quiz', 'button primary', handlers.onResume),
      createButton('Start Over', 'button', handlers.onStartOver),
    );
    element.append(actions);
  } else {
    element.append(createButton('Start Quiz', 'button primary', handlers.onStart));
  }

  return { element, heading };
}
