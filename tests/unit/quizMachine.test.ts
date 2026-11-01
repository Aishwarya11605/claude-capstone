import { describe, expect, it } from 'vitest';
import { createInitialState, restart, select, start, submit } from '../../src/quiz/quizMachine';
import type { Question, QuizState } from '../../src/quiz/types';

const questions: Question[] = Array.from({ length: 10 }, (_, i) => ({
  id: `q${i + 1}`,
  text: `Q${i + 1}`,
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
    { id: 'c', text: 'C' },
  ],
  correctOptionId: 'a',
}));

const idle = createInitialState();
const active = start(idle);
const submitted = submit(select(active, 'q1', 'a'), questions, 'manual', 1234);

describe('quizMachine transitions', () => {
  it('start moves idle to active with empty answers and no result', () => {
    expect(active).toEqual({ status: 'active', answers: {}, result: null });
  });

  it('select records and overwrites an answer while active', () => {
    const afterA = select(active, 'q1', 'a');
    const afterC = select(afterA, 'q1', 'c');
    expect(afterA.answers).toEqual({ q1: 'a' });
    expect(afterC.answers).toEqual({ q1: 'c' });
  });

  it('submit stores score, total, reason and remainingMs', () => {
    expect(submitted.status).toBe('submitted');
    expect(submitted.result).toEqual({ score: 1, total: 10, reason: 'manual', remainingMs: 1234 });
  });

  it('change-then-submit evaluates the last choice', () => {
    const state = select(select(active, 'q1', 'b'), 'q1', 'a');
    expect(submit(state, questions, 'manual', 0).result?.score).toBe(1);
  });

  it('restart returns a fresh active attempt', () => {
    expect(restart(submitted)).toEqual({ status: 'active', answers: {}, result: null });
  });

  it('never reorders the question list across start, submit and restart', () => {
    const order = questions.map((q) => q.id);
    restart(submit(select(start(createInitialState()), 'q2', 'b'), questions, 'timeout', 0));
    expect(questions.map((q) => q.id)).toEqual(order);
  });
});

describe('quizMachine ignored events', () => {
  const states: [string, QuizState][] = [
    ['idle', idle],
    ['active', active],
    ['submitted', submitted],
  ];

  it.each(states.filter(([name]) => name !== 'idle'))('start is ignored in %s', (_n, state) => {
    expect(start(state)).toBe(state);
  });

  it.each(states.filter(([name]) => name !== 'active'))('select is ignored in %s', (_n, state) => {
    expect(select(state, 'q1', 'b')).toBe(state);
  });

  it.each(states.filter(([name]) => name !== 'active'))('submit is ignored in %s', (_n, state) => {
    expect(submit(state, questions, 'timeout', 0)).toBe(state);
  });

  it.each(states.filter(([name]) => name !== 'submitted'))('restart is ignored in %s', (_n, state) => {
    expect(restart(state)).toBe(state);
  });

  it('a second submit leaves the first result unchanged', () => {
    const again = submit(submitted, questions, 'timeout', 0);
    expect(again.result).toEqual({ score: 1, total: 10, reason: 'manual', remainingMs: 1234 });
  });

  it('repeated restart is a no-op once active', () => {
    const fresh = restart(submitted);
    expect(restart(fresh)).toBe(fresh);
  });
});
