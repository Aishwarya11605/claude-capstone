import { describe, expect, it } from 'vitest';
import { validateDataset } from '../../src/quiz/validateDataset';

function makeQuestion(n: number) {
  return {
    id: `q${n}`,
    text: `Question ${n}`,
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
    correctOptionId: 'a',
  };
}

function makeDataset() {
  return {
    title: 'T',
    isPlaceholder: false,
    questions: Array.from({ length: 10 }, (_, i) => makeQuestion(i + 1)),
  };
}

type Dataset = ReturnType<typeof makeDataset>;

const invalidCases: [string, (d: Dataset) => unknown][] = [
  ['null', () => null],
  ['array instead of object', () => []],
  ['missing questions', () => ({ title: 'T' })],
  ['questions not an array', () => ({ questions: 'x' })],
  ['9 questions', (d) => ({ ...d, questions: d.questions.slice(0, 9) })],
  ['11 questions', (d) => ({ ...d, questions: [...d.questions, makeQuestion(11)] })],
  ['question not an object', (d) => ({ ...d, questions: [...d.questions.slice(0, 9), 'x'] })],
  ['empty options', (d) => { d.questions[0].options = []; return d; }],
  ['1 option', (d) => { d.questions[0].options = [{ id: 'a', text: 'A' }]; return d; }],
  ['7 options', (d) => {
    d.questions[0].options = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((id) => ({ id, text: id }));
    return d;
  }],
  ['options not an array', (d) => { (d.questions[0] as { options: unknown }).options = 'x'; return d; }],
  ['duplicate question ids', (d) => { d.questions[1].id = 'q1'; return d; }],
  ['empty question id', (d) => { d.questions[0].id = ''; return d; }],
  ['duplicate option ids', (d) => { d.questions[0].options[1].id = 'a'; return d; }],
  ['empty question text', (d) => { d.questions[0].text = '  '; return d; }],
  ['empty option text', (d) => { d.questions[0].options[0].text = ''; return d; }],
  ['missing correctOptionId', (d) => { (d.questions[0] as { correctOptionId?: string }).correctOptionId = undefined; return d; }],
  ['unknown correctOptionId', (d) => { d.questions[0].correctOptionId = 'zzz'; return d; }],
  ['missing title', (d) => { Reflect.deleteProperty(d, 'title'); return d; }],
  ['misnamed title key', (d) => { const { title, ...rest } = d; return { ...rest, name: title }; }],
  ['empty title', (d) => ({ ...d, title: '' })],
  ['blank title', (d) => ({ ...d, title: '   ' })],
  ['non-string title', (d) => ({ ...d, title: 42 })],
  ['missing isPlaceholder', (d) => { Reflect.deleteProperty(d, 'isPlaceholder'); return d; }],
  ['isPlaceholder as the string "false"', (d) => ({ ...d, isPlaceholder: 'false' })],
  ['isPlaceholder as a number', (d) => ({ ...d, isPlaceholder: 1 })],
  ['isPlaceholder as null', (d) => ({ ...d, isPlaceholder: null })],
];

describe('validateDataset', () => {
  it('accepts a valid dataset', () => {
    expect(validateDataset(makeDataset())).toEqual([]);
  });

  it('accepts isPlaceholder true', () => {
    expect(validateDataset({ ...makeDataset(), isPlaceholder: true })).toEqual([]);
  });

  it('names the title problem and the isPlaceholder problem', () => {
    const problems = validateDataset({ ...makeDataset(), title: '', isPlaceholder: 'x' });
    expect(problems.some((p) => p.includes('title'))).toBe(true);
    expect(problems.some((p) => p.includes('isPlaceholder'))).toBe(true);
  });

  it.each(invalidCases)('rejects: %s', (_name, mutate) => {
    expect(validateDataset(mutate(makeDataset())).length).toBeGreaterThan(0);
  });
});
