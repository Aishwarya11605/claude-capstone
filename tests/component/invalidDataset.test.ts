// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import validDataset from '../../src/data/questions.json';
import { mountApp } from '../../src/ui/app';
import { FakeClock, FakeScheduler, FakeVisibility } from '../unit/helpers/fakeClock';

function clone() {
  return structuredClone(validDataset);
}

const invalidDatasets: [string, () => unknown][] = [
  ['wrong shape', () => ({ title: 'x' })],
  ['9 questions', () => ({ ...clone(), questions: clone().questions.slice(0, 9) })],
  ['question with no options', () => { const d = clone(); d.questions[0].options = []; return d; }],
  ['bad correct option id', () => { const d = clone(); d.questions[0].correctOptionId = 'nope'; return d; }],
  ['duplicate question ids', () => { const d = clone(); d.questions[1].id = d.questions[0].id; return d; }],
  ['empty question text', () => { const d = clone(); d.questions[0].text = ''; return d; }],
  ['missing title', () => { const d = clone(); Reflect.deleteProperty(d, 'title'); return d; }],
  ['isPlaceholder not a boolean', () => ({ ...clone(), isPlaceholder: 'false' })],
];

describe('mountApp with invalid datasets', () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.replaceChildren();
    root = document.createElement('div');
    document.body.append(root);
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(invalidDatasets)('shows an alert and no Start button: %s', (_name, make) => {
    const clock = new FakeClock();
    const scheduler = new FakeScheduler(clock);
    const visibility = new FakeVisibility();
    const setIntervalSpy = vi.spyOn(scheduler, 'setInterval');

    mountApp(root, make(), { clock, scheduler, visibility });

    const alert = root.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('Quiz data is invalid');
    const buttons = [...root.querySelectorAll('button')];
    expect(buttons.some((b) => b.textContent === 'Start Quiz')).toBe(false);
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(visibility.listenerCount).toBe(0);
    expect(console.error).toHaveBeenCalled();
  });

  it('creates exactly one empty announcer after mount', () => {
    const clock = new FakeClock();
    mountApp(root, clone(), { clock, scheduler: new FakeScheduler(clock), visibility: new FakeVisibility() });
    const announcers = root.querySelectorAll('[role="status"][aria-live="polite"]');
    expect(announcers).toHaveLength(1);
    expect(announcers[0].textContent).toBe('');
  });
});
