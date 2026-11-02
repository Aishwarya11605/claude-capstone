import { TIMEOUT_NOTICE } from '../config';
import type { Result } from '../quiz/types';
import { createButton, createEl, createHeading, type View } from './dom';
import { formatTime } from './format';

export function createResultsView(result: Result, onRestart: () => void): View {
  const element = createEl('section', 'screen results-screen');
  const heading = createHeading('Results');
  element.append(
    heading,
    createEl('p', 'score', `Your score: ${result.score} / ${result.total}`i),
    createEl('p', 'remaining', `Time remaining at submit: ${formatTime(result.remainingMs)}`i),
  );
  if (result.reason === 'timeout') element.append(createEl('p', 'timeout-notice', TIMEOUT_NOTICE));
  element.append(createButton('Restart Quiz', 'button primary', onRestart));
  return { element, heading };
}
