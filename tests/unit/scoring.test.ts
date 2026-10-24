import { describe, expect, it } from 'vitest';
import { score } from '../../src/quiz/scoring';
import type { Answers, Question } from '../../src/quiz/types';

const questions: Question[] = Array.from({ length: 10 }, (_, i) => ({
  id: `q${i + 1}`,
  text: `Q${i + 1}`,
  options: [
    { id: 'a', text: 'A' },
    { id: 'b', text: 'B' },
  ],
  correctOptionId: 'a',
}));

function answersFor(correctCount: number, wrongCount = 10 - correctCount): Answers {
  const answers: Answers = {};
  questions.forEach((q, i) => {
    if (i < correctCount) answers[q.id] = 'a';
    else if (i < correctCount + wrongCount) answers[q.id] = 'b';
  });
  return answers;
}

describe('score', () => {
  it('scores 10 when all are correct', () => {
    expect(score(questions, answersFor(10))).toBe(10);
  });

  it('scores 0 when none are correct', () => {
    expect(score(questions, answersFor(0))).toBe(0);
  });

  it('scores 5 for a mixed attempt', () => {
    expect(score(questions, answersFor(5))).toBe(5);
  });

  it('scores 0 when all are unanswered', () => {
    expect(score(questions, {})).toBe(0);
  });

  it('counts only answered correct questions when some are unanswered', () => {
    expect(score(questions, answersFor(3, 2))).toBe(3);
  });

  it('ignores answers for unknown question ids', () => {
    expect(score(questions, { ...answersFor(2, 0), unknown: 'a' })).toBe(2);
  });

  it('uses the last chosen option when the answer is overwritten', () => {
    const answers: Answers = { q1: 'b' };
    answers.q1 = 'a';
    expect(score(questions, answers)).toBe(1);
  });
});
