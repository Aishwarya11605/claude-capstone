import type { Answers, Question } from './types';

export interface QuestionEvaluation {
  questionId: string;
  isCorrect: boolean;
  selectedOptionId: string | null;
  correctOptionId: string;
}

export function evaluateQuestions(
  questions: Question[],
  answers: Answers,
): QuestionEvaluation[] {
  return questions.map((question) => {
    const selected = answers[question.id];
    return {
      questionId: question.id,
      isCorrect: selected === question.correctOptionId,
      selectedOptionId: selected ?? null,
      correctOptionId: question.correctOptionId,
    };
  });
}

export function score(questions: Question[], answers: Answers): number {
  let points = 0;
  for (const question of questions) {
    if (answers[question.id] === question.correctOptionId) {
      points += 1;
    }
  }
  return points;
}
