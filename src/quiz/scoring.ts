import type { Answers, Question } from './types';

export function score(questions: Question[], answers: Answers: number {
  let points = 0;
  for (const question of questions) {
    if (answers[question.id] === question.correctOptionId) {
      points += 1;
    }
  }
  return points;
}
