import type { Answers } from './types';

const STORAGE_KEY = 'quiz.activeAttempt.v1';
const SCHEMA_VERSION = 1 as const;

export interface PersistedAttemptV1 {
  schemaVersion: typeof SCHEMA_VERSION;
  datasetSignature: string;
  // absolute deadline for the attempt
  deadlineEpochMs: number;
  // answers chosen so far
  answers: Answers;
}

export type PersistedAttempt = PersistedAttemptV1;

export type LoadAttemptResult =
  | { status: 'none' }
  | { status: 'unavailable'; error: unknown }
  | { status: 'corrupt'; error: unknown }
  | { status: 'incompatible'; reason: 'schema' | 'dataset' }
  | { status: 'expired' }
  | { status: 'ok'; attempt: PersistedAttempt };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAnswers(value: unknown): value is Answers {
  if (!isRecord(value)) return false;
  for (const [k, v] of Object.entries(value)) {
    if (typeof k !== 'string') return false;
    if (typeof v !== 'string') return false;
  }
  return true;
}

function parseAttempt(json: string): PersistedAttempt {
  const parsed = JSON.parse(json) as unknown;
  if (!isRecord(parsed)) throw new Error('Persisted attempt is not an object');

  const schemaVersion = parsed.schemaVersion;
  const datasetSignature = parsed.datasetSignature;
  const deadlineEpochMs = parsed.deadlineEpochMs;
  const answers = parsed.answers;

  if (schemaVersion !== SCHEMA_VERSION) throw new Error('Unsupported schemaVersion');
  if (typeof datasetSignature !== 'string') throw new Error('datasetSignature must be string');
  if (typeof deadlineEpochMs !== 'number' || !Number.isFinite(deadlineEpochMs)) {
    throw new Error('deadlineEpochMs must be a finite number');
  }
  if (!isAnswers(answers)) throw new Error('answers must be a record of strings');

  return { schemaVersion, datasetSignature, deadlineEpochMs, answers };
}

export function loadAttempt(nowEpochMs: number, datasetSignature: string): LoadAttemptResult {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return { status: 'unavailable', error };
  }

  if (raw === null) return { status: 'none' };

  let attempt: PersistedAttempt;
  try {
    attempt = parseAttempt(raw);
  } catch (error) {
    // clear corrupted payloads proactively
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return { status: 'corrupt', error };
  }

  if (attempt.schemaVersion !== SCHEMA_VERSION) {
    safeClearAttempt();
    return { status: 'incompatible', reason: 'schema' };
  }

  if (attempt.datasetSignature !== datasetSignature) {
    safeClearAttempt();
    return { status: 'incompatible', reason: 'dataset' };
  }

  if (nowEpochMs >= attempt.deadlineEpochMs) {
    safeClearAttempt();
    return { status: 'expired' };
  }

  return { status: 'ok', attempt };
}

export function saveAttempt(attempt: PersistedAttempt): void {
  const payload = JSON.stringify(attempt);
  localStorage.setItem(STORAGE_KEY, payload);
}

export function safeClearAttempt(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
