// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import dataset from '../../src/data/questions.json';
import { mountApp } from '../../src/ui/app';
import { FakeClock, FakeScheduler, FakeVisibility } from '../unit/helpers/fakeClock';

let root: HTMLElement;
let clock: FakeClock;
let scheduler: FakeScheduler;
let visibility: FakeVisibility;
let dispose: () => void;

function mount() {
  document.body.replaceChildren();
  root = document.createElement('div');
  document.body.append(root);
  clock = new FakeClock();
  scheduler = new FakeScheduler(clock);
  visibility = new FakeVisibility();
  dispose = mountApp(root, dataset, { clock, scheduler, visibility });
}

function button(name: string): HTMLButtonElement {
  const found = [...root.querySelectorAll('button')].find((b) => b.textContent === name);
  if (!found) throw new Error(`No button named ${name}`);
  return found;
}

function radio(questionIndex: number, optionIndex: number): HTMLInputElement {
  const fieldset = root.querySelectorAll('fieldset')[questionIndex];
  return fieldset.querySelectorAll('input')[optionIndex];
}

function chooseCorrect(count: number) {
  dataset.questions.slice(0, count).forEach((question, index) => {
    const optionIndex = question.options.findIndex((o) => o.id === question.correctOptionId);
    radio(index, optionIndex).click();
  });
}

const text = () => root.textContent ?? '';
const announcer = () => root.querySelector('[role="status"]')!.textContent;
const questionTexts = () => [...root.querySelectorAll('legend')].map((l) => l.textContent);

beforeEach(mount);
afterEach(() => dispose());

describe('Start screen', () => {
  it('shows an enabled Start Quiz button and the placeholder banner', () => {
    expect(button('Start Quiz').disabled).toBe(false);
    expect(text()).toContain('Placeholder questions - sample content');
    expect(root.querySelector('[role="timer"]')).toBeNull();
  });
});

describe('Quiz screen', () => {
  beforeEach(() => button('Start Quiz').click());

  it('shows 10 fieldsets, options and the timer at 05:00', () => {
    expect(root.querySelectorAll('fieldset')).toHaveLength(10);
    expect(root.querySelectorAll('fieldset')[0].querySelectorAll('input[type="radio"]')).toHaveLength(4);
    expect(root.querySelector('[role="timer"]')?.textContent).toBe('05:00');
    expect(text()).toContain('Time limit: 5 minutes');
    expect(text()).toContain('0 of 10 answered');
  });

  it('puts the bar with Submit Quiz last in the DOM', () => {
    const section = root.querySelector('.quiz-screen')!;
    const last = section.lastElementChild!;
    expect(last.querySelector('[role="timer"]')).not.toBeNull();
    expect(last.lastElementChild).toBe(button('Submit Quiz'));
  });

  it('updates the timer as time passes', () => {
    clock.advanceBoth(1000);
    expect(root.querySelector('[role="timer"]')?.textContent).toBe('04:59');
  });

  it('keeps only the last chosen option checked and updates the answered count', () => {
    radio(0, 0).click();
    radio(0, 2).click();
    expect(radio(0, 0).checked).toBe(false);
    expect(radio(0, 2).checked).toBe(true);
    expect(root.querySelectorAll('input:checked')).toHaveLength(1);
    expect(text()).toContain('1 of 10 answered');
  });

  it('does not rebuild the radios on tick or selection', () => {
    const first = radio(0, 0);
    first.click();
    clock.advanceBoth(2000);
    expect(radio(0, 0)).toBe(first);
  });
});

describe('Results screen', () => {
  it('shows the score after a manual submit and ignores a second click', () => {
    button('Start Quiz').click();
    chooseCorrect(6);
    clock.advanceBoth(30000);
    const submit = button('Submit Quiz');
    submit.click();
    submit.click();
    expect(root.querySelectorAll('.results-screen')).toHaveLength(1);
    expect(text()).toContain('Your score: 6 / 10');
    expect(text()).toContain('Time remaining at submit: 04:30');
    expect(text()).not.toContain('Time is up');
    expect(root.querySelector('input')).toBeNull();
    expect(root.querySelector('[role="timer"]')).toBeNull();
    expect(document.activeElement?.textContent).toBe('Results');
    expect(announcer()).toBe('Your score is 6 out of 10');
  });

  it('auto-submits after 300 s with the timeout notice', () => {
    button('Start Quiz').click();
    chooseCorrect(3);
    clock.advanceBoth(300000);
    expect(text()).toContain('Your score: 3 / 10');
    expect(text()).toContain('Time is up - your quiz was submitted automatically');
    expect(text()).toContain('Time remaining at submit: 00:00');
    expect(announcer()).toContain('Time is up');
    expect(announcer()).toContain('Your score is 3 out of 10');
  });

  it('does not use role="status" on the results text', () => {
    button('Start Quiz').click();
    button('Submit Quiz').click();
    expect(root.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(root.querySelector('.results-screen [role="status"]')).toBeNull();
  });
});

describe('Restart and announcements', () => {
  it('Restart Quiz returns a fresh quiz with the same question order', () => {
    button('Start Quiz').click();
    const order = questionTexts();
    chooseCorrect(7);
    button('Submit Quiz').click();
    button('Restart Quiz').click();
    expect(root.querySelectorAll('input:checked')).toHaveLength(0);
    expect(root.querySelector('[role="timer"]')?.textContent).toBe('05:00');
    expect(questionTexts()).toEqual(order);
    expect(text()).not.toContain('Your score');
    expect(text()).toContain('0 of 10 answered');
    expect(document.activeElement?.tagName).toBe('H1');
    clock.advanceBoth(1000);
    expect(root.querySelector('[role="timer"]')?.textContent).toBe('04:59');
  });

  it('announces 60 s and 30 s remaining', () => {
    button('Start Quiz').click();
    expect(announcer()).toBe('');
    clock.advanceBoth(240000);
    expect(announcer()).toBe('1 minute remaining');
    clock.advanceBoth(30000);
    expect(announcer()).toBe('30 seconds remaining');
  });
});

describe('Rendering rules', () => {
  it('adds no style attributes and no style elements on any screen', () => {
    const check = () => {
      expect(root.querySelectorAll('[style]')).toHaveLength(0);
      expect(document.querySelectorAll('style')).toHaveLength(0);
    };
    check();
    button('Start Quiz').click();
    check();
    chooseCorrect(2);
    button('Submit Quiz').click();
    check();
  });
});

describe('Teardown', () => {
  it('dispose removes the visibility listener and stops the timer', () => {
    button('Start Quiz').click();
    expect(visibility.listenerCount).toBe(1);
    expect(scheduler.activeCount).toBe(1);
    dispose();
    expect(visibility.listenerCount).toBe(0);
    expect(scheduler.activeCount).toBe(0);
  });

  it('mounting again after dispose leaves exactly one listener and one timer', () => {
    button('Start Quiz').click();
    dispose();
    const nextVisibility = new FakeVisibility();
    const nextScheduler = new FakeScheduler(clock);
    dispose = mountApp(root, dataset, { clock, scheduler: nextScheduler, visibility: nextVisibility });
    button('Start Quiz').click();
    expect(visibility.listenerCount).toBe(0);
    expect(scheduler.activeCount).toBe(0);
    expect(nextVisibility.listenerCount).toBe(1);
    expect(nextScheduler.activeCount).toBe(1);
  });
});
