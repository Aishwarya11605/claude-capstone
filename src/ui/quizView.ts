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

export function createQuizView(dataset: Dataset, handlers: QuizView