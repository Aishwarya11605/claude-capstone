import { score } from './scoring';
import type { Question, QuizState, SubmitReason } from './types';

export function createInitialState(): QuizState {
  return { status: 'idle', answers: {}, result: null };
}

export function start(state: QuizState): QuizState {
  if (state.status !== 'idle') return state;
  return { status: 'active', answers: {}, result: null };
}

export function select(state: QuizState, questionId: string, optionId: string): QuizState {
  if (state.status !== 'active') return state;
  return { ...state, answers: { ...state.answers, [questionId]: optionId } };
}

export function submit(
  state: QuizState,
  questions: Question[],
  reason: SubmitReason,
  remainingMs: number,
): QuizState {
  if (state.status !== 'active') return state;
  return {
    status: 'submitted',
    answers: state.answers,
    result: { score: score(questions, state.answers), total: questions.length, reason, remainingMs },
  };
}

export function restart(state: QuizState): QuizState {
  if (state.status !== 'submitted') return state;
  return { status: 'active', answers: {}, result: null };
}
