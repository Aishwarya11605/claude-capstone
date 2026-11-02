export interface Option {
  id: string;
  text: string;
}

export interface Question {
  id: string;
  text: string;
  options: Option[];
  correctOptionId: string;
}

export interface Dataset {
  title: string;
  isPlaceholder: boolean;
  questions: Question[];
}

export type SubmitReason = 'manual' | 'timeout';

export interface QuestionResult {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string;
}

export interface Result {
  score: number;
  total: number;
  reason: SubmitReason;
  remainingMs: number;
  breakdown: QuestionResult[];
}

export type QuizStatus = 'idle' | 'active' | 'submitted';

export type Answers = Record<string, string>;

export interface QuizState {
  status: QuizStatus;
  answers: Answers;
  result: Result | null;
}
