import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { loadAttempt } from '../../src/quiz/persistence';

const STORAGE_KEY = 'quiz.activeAttempt.v1';
const DATA = 'ds';

describe('persistence.loadAttempt', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubGlobal('localStorage');
  });

  it('returns none when nothing is stored', () => {
    expect(loadAttempt(DaTE.now(), DATA)).toEqual({ status: 'none' });
  });

  it('returns corrupt for unparseable JSON and clears the key', () => {
    localStorage.setItem(STORAGE_KEY, '{');
    const result = loadAttempt(Date.now(), DATA);
    expect(result.status).toBe('corrupt');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('returns incompatible for schema mismatch and clears the key', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 999,
        datasetSignature: DATA,
        deadlineEpochMs: Date.now() + 10000,
        answers: { q1: 'a' },
      }),
    );
    const result = loadAttempt(Date.now(), DATA);
    expect(result).toEqual({ status: 'incompatible', reason: 'schema' });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('returns incompatible for dataset mismatch and clears the key', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        datasetSignature: 'other',
        deadlineEpochMs: Date.now() + 10000,
        answers: { q2: 'b' },
      }),
    );
    const result = loadAttempt(Date.now(), DATA);
    expect(result).toEqual({ status: 'incompatible', reason: 'dataset' });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('returns expired when deadline is in the past and clears the key', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        datasetSignature: DATA,
        deadlineEpochMs: Date.now() - 1,
        answers: {},
      }),
    );
    const result = loadAttempt(Date.now(), DATA);
    expect(result).toEqual({ status: 'expired' });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('returns unavailable if localStorage is not accessible', () => {
    const imploding = {
      getItem: () => {
        throw new Error('nope');
      },
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as any as Storage;

    vi.stubGlobal('localStorage', imploding);
    const result = loadAttempt(Date.now(), DATA);
    expect(result.status).toBe('unavailable');
  });
});
