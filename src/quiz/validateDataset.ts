import { MAX_OPTIONS, MIN_OPTIONS, QUESTION_COUNT } from '../config';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function validateQuestion(question: unknown, index: number, seenIds: Set<string>, problems: string[]): void {
  const label = `Question ${index + 1}`;
  if (!isRecord(question)) {
    problems.push(`${label} is not an object`);
    return;
  }
  if (!isNonEmptyString(question.id)) {
    problems.push(`${label} has an empty or missing id`);
  } else if (seenIds.has(question.id)) {
    problems.push(`${label} has a duplicate id "${question.id}"`);
  } else {
    seenIds.add(question.id);
  }
  if (!isNonEmptyString(question.text)) {
    problems.push(`${label} has empty or missing text`);
  }
  const options = question.options;
  if (!Array.isArray(options)) {
    problems.push(`${label} has no options array`);
    return;
  }
  if (options.length < MIN_OPTIONS || options.length > MAX_OPTIONS) {
    problems.push(`${label} must have ${MIN_OPTIONS} to ${MAX_OPTIONS} options, found ${options.length}`);
  }
  const optionIds = new Set<string>();
  let correctMatches = 0;
  options.forEach((option: unknown, optionIndex: number) => {
    if (!isRecord(option)) {
      problems.push(`${label} option ${optionIndex + 1} is not an object`);
      return;
    }
    if (!isNonEmptyString(option.id)) {
      problems.push(`${label} option ${optionIndex + 1} has an empty or missing id`);
    } else if (optionIds.has(option.id)) {
      problems.push(`${label} has a duplicate option id "${option.id}"`);
    } else {
      optionIds.add(option.id);
      if (option.id === question.correctOptionId) {
        correctMatches += 1;
      }
    }
    if (!isNonEmptyString(option.text)) {
      problems.push(`${label} option ${optionIndex + 1} has empty or missing text`);
    }
  });
  if (correctMatches !== 1) {
    problems.push(`${label} correctOptionId must match exactly one option`);
  }
}

export function validateDataset(data: unknown): string[] {
  const problems: string[] = [];
  if (!isRecord(data) || !Array.isArray(data.questions)) {
    return ['Dataset must be an object with a questions array'];
  }
  if (!isNonEmptyString(data.title)) {
    problems.push('Dataset has an empty or missing title');
  }
  if (typeof data.isPlaceholder !== 'boolean') {
    problems.push('Dataset isPlaceholder must be true or false');
  }
  if (data.questions.length !== QUESTION_COUNT) {
    problems.push(`Dataset must have exactly ${QUESTION_COUNT} questions, found ${data.questions.length}`);
  }
  const seenIds = new Set<string>();
  data.questions.forEach((question: unknown, index: number) => {
    validateQuestion(question, index, seenIds, problems);
  });
  return problems;
}
