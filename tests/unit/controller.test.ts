import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DURATION_MS, TIMEOUT_NOTICE } from '../../src/config';
import { Controller } from '../../src/quiz/controller';
import { score } from '../../src/quiz/scoring';
import type { Dataset } from '../../src/quiz/types';
import { FakeClock, FakeScheduler, FakeVisibility } from './helpers/fakeClock';

vi.mock('../../src/quiz/scoring', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/quiz/scoring')>();
  return { ...actual, score: vi.fn(actual.score) };
});

const dataset: Dataset = {
  title: 'T',
  isPlaceholder: false,
  questions: Array.from({ length: 10 }, (_, i) => ({
    id: `q${i + 1}`,
    text: `Q${i + 1}`,
    options: [
      { id: 'a', text: 'A' },
      { id: 'b', text: 'B' },
    ],
    correctOptionId: 'a',
  })),
};

function setup() {
  const clock = new FakeClock();
  const scheduler = new FakeScheduler(clock);
  const visibility = new FakeVisibility();
  const messages: string[] = [];
  const controller = new Controller(dataset, {
    clock,
    scheduler,
    visibility,
    announce: (text) => messages.push(text),
  });
  const notifications: string[] = [];
  controller.subscribe((state) => notifications.push(state.status));
  return { clock, scheduler, visibility, messages, controller, notifications };
}

function answerFirst(controller: Controller, count: number, optionId = 'a') {
  for (let i = 1; i <= count; i++) controller.select(`q${i}`, optionId);
}

beforeEach(() => {
  vi.mocked(score).mockClear();
});

describe('Controller timeout', () => {
  it('advancing 300 s gives one timeout result with the selections at the deadline', () => {
    const { clock, controller, scheduler } = setup();
    controller.start();
    answerFirst(controller, 4);
    clock.advanceBoth(DURATION_MS);
    const state = controller.getState();
    expect(state.status).toBe('submitted');
    expect(state.result).toEqual({ score: 4, total: 10, reason: 'timeout', remainingMs: 0 });
    expect(score).toHaveBeenCalledTimes(1);
    expect(scheduler.activeCount).toBe(0);
  });

  it('AT-08: deadline reached without a tick, then select, routes to timeout and ignores the selection', () => {
    const { clock, controller } = setup();
    controller.start();
    answerFirst(controller, 2);
    clock.jumpBoth(DURATION_MS);
    controller.select('q3', 'a');
    const result = controller.getState().result;
    expect(result).toEqual({ score: 2, total: 10, reason: 'timeout', remainingMs: 0 });
  });

  it('AT-08: deadline reached without a tick, then manual submit, is a timeout', () => {
    const { clock, controller } = setup();
    controller.start();
    answerFirst(controller, 3);
    clock.jumpBoth(DURATION_MS + 10);
    controller.submit();
    expect(controller.getState().result?.reason).toBe('timeout');
    expect(controller.getState().result?.remainingMs).toBe(0);
  });

  it('visibility change after the deadline passed while hidden gives exactly one result', () => {
    const { clock, controller, visibility, notifications } = setup();
    controller.start();
    clock.jumpBoth(DURATION_MS + 5000);
    visibility.fire();
    visibility.fire();
    expect(controller.getState().result?.reason).toBe('timeout');
    expect(notifications.filter((s) => s === 'submitted')).toHaveLength(1);
    expect(score).toHaveBeenCalledTimes(1);
  });
});

describe('Controller submit exactly once', () => {
  it('manual submit records remaining time and score', () => {
    const { clock, controller } = setup();
    controller.start();
    answerFirst(controller, 5);
    clock.advanceBoth(20000);
    controller.submit();
    expect(controller.getState().result).toEqual({
      score: 5,
      total: 10,
      reason: 'manual',
      remainingMs: DURATION_MS - 20000,
    });
  });

  it('double submit evaluates and notifies once', () => {
    const { controller, notifications } = setup();
    controller.start();
    controller.submit();
    controller.submit();
    expect(score).toHaveBeenCalledTimes(1);
    expect(notifications.filter((s) => s === 'submitted')).toHaveLength(1);
  });

  it('submit then expiry leaves the manual result', () => {
    const { clock, controller } = setup();
    controller.start();
    clock.advanceBoth(1000);
    controller.submit();
    clock.advanceBoth(400000);
    expect(controller.getState().result?.reason).toBe('manual');
    expect(controller.getState().result?.remainingMs).toBe(DURATION_MS - 1000);
    expect(score).toHaveBeenCalledTimes(1);
  });

  it('expiry then submit leaves the timeout result', () => {
    const { clock, controller } = setup();
    controller.start();
    clock.advanceBoth(DURATION_MS);
    controller.submit();
    expect(controller.getState().result?.reason).toBe('timeout');
    expect(score).toHaveBeenCalledTimes(1);
  });

  it('after submit, advancing clocks changes nothing and selections are ignored', () => {
    const { clock, controller, notifications, visibility } = setup();
    controller.start();
    controller.select('q1', 'a');
    controller.submit();
    const state = controller.getState();
    const count = notifications.length;
    clock.advanceBoth(DURATION_MS * 2);
    visibility.fire();
    controller.select('q2', 'a');
    expect(controller.getState()).toBe(state);
    expect(notifications).toHaveLength(count);
  });
});

describe('Controller restart', () => {
  it('restart gives a fresh attempt with a new running timer', () => {
    const { clock, controller, scheduler } = setup();
    controller.start();
    answerFirst(controller, 7);
    clock.advanceBoth(10000);
    controller.submit();
    controller.restart();
    const state = controller.getState();
    expect(state).toEqual({ status: 'active', answers: {}, result: null });
    expect(controller.getRemainingMs()).toBe(DURATION_MS);
    expect(scheduler.activeCount).toBe(1);
    clock.advanceBoth(1000);
    expect(controller.getRemainingMs()).toBe(DURATION_MS - 1000);
  });

  it('rapid double restart gives one attempt and one timer', () => {
    const { controller, scheduler } = setup();
    controller.start();
    controller.submit();
    controller.restart();
    controller.restart();
    expect(scheduler.activeCount).toBe(1);
    expect(controller.getState().status).toBe('active');
  });

  it('TS-13: 7 correct, restart, 3 correct gives 3', () => {
    const { controller } = setup();
    controller.start();
    answerFirst(controller, 7);
    controller.submit();
    expect(controller.getState().result?.score).toBe(7);
    controller.restart();
    answerFirst(controller, 3);
    controller.submit();
    expect(controller.getState().result?.score).toBe(3);
  });

  it('the old attempt does not expire the new attempt', () => {
    const { clock, controller } = setup();
    controller.start();
    clock.advanceBoth(200000);
    controller.submit();
    controller.restart();
    clock.advanceBoth(150000);
    expect(controller.getState().status).toBe('active');
    expect(controller.getRemainingMs()).toBe(DURATION_MS - 150000);
  });
});

describe('Controller announcements (AT-07)', () => {
  it('speaks 60 s and 30 s once each per attempt', () => {
    const { clock, controller, messages } = setup();
    controller.start();
    clock.advanceBoth(240000);
    clock.advanceBoth(10000);
    clock.advanceBoth(30000);
    expect(messages).toEqual(['1 minute remaining', '30 seconds remaining']);
  });

  it('a single recompute crossing both thresholds speaks only 30 seconds', () => {
    const { clock, scheduler, controller, messages } = setup();
    controller.start();
    clock.jumpBoth(DURATION_MS - 20000);
    scheduler.fireAll();
    expect(messages).toEqual(['30 seconds remaining']);
    scheduler.fireAll();
    expect(messages).toEqual(['30 seconds remaining']);
  });

  it('resets the flags on restart', () => {
    const { clock, controller, messages } = setup();
    controller.start();
    clock.advanceBoth(250000);
    controller.submit();
    messages.length = 0;
    controller.restart();
    clock.advanceBoth(250000);
    expect(messages).toEqual(['1 minute remaining']);
  });

  it('announces the score for a manual submit', () => {
    const { controller, messages } = setup();
    controller.start();
    answerFirst(controller, 6);
    controller.submit();
    expect(messages.at(-1)).toBe('Your score is 6 out of 10');
  });

  it('announces the timeout notice and score for a timeout', () => {
    const { clock, controller, messages } = setup();
    controller.start();
    answerFirst(controller, 2);
    clock.advanceBoth(DURATION_MS);
    expect(messages.at(-1)).toContain(TIMEOUT_NOTICE);
    expect(messages.at(-1)).toContain('Your score is 2 out of 10');
    expect(messages.filter((m) => m.includes('Your score'))).toHaveLength(1);
  });
});

describe('Controller guards', () => {
  it('ignores select, submit and restart before start', () => {
    const { controller, notifications } = setup();
    controller.select('q1', 'a');
    controller.submit();
    controller.restart();
    expect(controller.getState().status).toBe('idle');
    expect(notifications).toHaveLength(0);
  });

  it('dispose unsubscribes from visibility and stops the timer', () => {
    const { controller, visibility, scheduler } = setup();
    controller.start();
    controller.dispose();
    expect(visibility.listenerCount).toBe(0);
    expect(scheduler.activeCount).toBe(0);
  });
});
