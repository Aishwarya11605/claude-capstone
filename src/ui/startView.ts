import { DURATION_MS, QUESTION_COUNT } from '../config';
import type { Dataset } from '../quiz/types';
import { createButton, createEl, createHeading, createPlaceholderBanner, type View } from './dom';

export function createStartView(dataset: Dataset, onStart: () => void): View {
  const element = createEl('section', 'screen start-screen');
  const heading = createHeading(dataset.title);
  element.append(heading);
  if (dataset.isPlaceholder) element.append(createPlaceholderBanner());
  const minutes = DURATION_MS / 60000;
  element.append(
    createEl('p', undefined, `${QUESTION_COUNT} questions, ${minutes} minutes`),
    createButton('Start Quiz', 'button primary', onStart),
  );
  return { element, heading };
}
