import { describe, expect, it } from 'vitest';
import dataset from '../../src/data/questions.json';
import { validateDataset } from '../../src/quiz/validateDataset';

describe('shipped dataset', () => {
  it('has no validation problems', () => {
    expect(validateDataset(dataset)).toEqual([]);
  });

  it('is marked as placeholder with 10 questions', () => {
    expect(dataset.isPlaceholder).toBe(true);
    expect(dataset.questions).toHaveLength(10);
  });
});
