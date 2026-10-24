import { describe, expect, it } from 'vitest';
import alt from '../e2e/fixtures/valid-alt.json';
import { validateDataset } from '../../src/quiz/validateDataset';

describe('alternate E2E fixture', () => {
  it('is a valid dataset', () => {
    expect(validateDataset(alt)).toEqual([]);
  });

  it('differs from the shipped dataset', () => {
    expect(alt.isPlaceholder).toBe(false);
    expect(alt.title).toBe('Alternate Quiz');
  });
});
