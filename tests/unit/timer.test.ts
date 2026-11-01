import { describe, expect, it } from 'vitest';
import { DURATION_MS } from '../../src/config';
import type { IntervalHandle, Scheduler } from '../../src/platform/clock';
import { Timer } from '../../src/quiz/timer';
import { FakeClock, FakeScheduler } from './helpers/fakeClock';

function setup() {
  const clock = new FakeClock();
  const scheduler = new FakeScheduler(clock);
  const timer = new Timer(clock, scheduler);
  const ticks: number[] = [];
  let expired = 0;
  timer.onTick((remaining) => ticks.push(remaining));
  timer.onExpire(() => expired++);
  timer.start();
  return { clock, scheduler, timer, ticks, expiredCount: () => expired };
}

describe('Timer', () => {
  it('starts at the full duration', () => {
    expect(setup().timer.remainingMs()).toBe(DURATION_MS);
  });

  it.each([1, 30, 299])('shows %i s elapsed', (seconds) => {
    const { clock, timer } = setup();
    clock.advanceBoth(seconds * 1000);
    expect(timer.remainingMs()).toBe(DURATION_MS - seconds * 1000);
  });

  it('AT-09: 299999 ms elapsed leaves 1 ms and is still active', () => {
    const { clock, timer, expiredCount } = setup();
    clock.advanceBoth(299999);
    expect(timer.remainingMs()).toBe(1);
    expect(expiredCount()).toBe(0);
  });

  it('AT-09: 300000 ms elapsed is 0 and expires exactly once', () => {
    const { clock, scheduler, timer, expiredCount } = setup();
    clock.advanceBoth(300000);
    expect(timer.remainingMs()).toBe(0);
    expect(expiredCount()).toBe(1);
    clock.advanceBoth(10000);
    expect(expiredCount()).toBe(1);
    expect(scheduler.activeCount).toBe(0);
  });

  it('gives the same value after one throttled tick as after many small ones', () => {
    const small = setup();
    small.clock.advanceBoth(120000);
    const big = setup();
    big.clock.jumpBoth(120000);
    big.scheduler.fireAll();
    expect(big.ticks.at(-1)).toBe(small.ticks.at(-1));
    expect(big.timer.remainingMs()).toBe(small.timer.remainingMs());
  });

  it('AT-01: wall clock set backwards does not change remaining time', () => {
    const { clock, timer } = setup();
    clock.advanceBoth(10000);
    clock.setWall(clock.wallNow() - 3_600_000);
    expect(timer.remainingMs()).toBe(DURATION_MS - 10000);
  });

  it('AT-01: wall clock advancing while monotonic stalls still expires', () => {
    const { clock, scheduler, expiredCount } = setup();
    clock.setWall(clock.wallNow() + DURATION_MS);
    clock.advanceMono(250);
    expect(scheduler.activeCount).toBe(0);
    expect(expiredCount()).toBe(1);
  });

  it('AT-01: wall clock set forwards ends the quiz early', () => {
    const { clock, timer } = setup();
    clock.advanceBoth(1000);
    clock.setWall(clock.wallNow() + 200000);
    expect(timer.remainingMs()).toBe(DURATION_MS - 201000);
  });

  it('never increases remaining time (high-water mark)', () => {
    const { clock, timer } = setup();
    clock.advanceBoth(60000);
    const before = timer.remainingMs();
    clock.setWall(clock.wallNow() - 1_000_000);
    expect(timer.remainingMs()).toBeLessThanOrEqual(before);
  });

  it('stop prevents further ticks and expiry', () => {
    const { clock, timer, ticks, expiredCount } = setup();
    clock.advanceBoth(1000);
    timer.stop();
    const tickCount = ticks.length;
    clock.advanceBoth(400000);
    expect(ticks.length).toBe(tickCount);
    expect(expiredCount()).toBe(0);
  });

  it('ignores a callback that was queued before stop', () => {
    const clock = new FakeClock();
    const callbacks: (() => void)[] = [];
    const scheduler: Scheduler = {
      setInterval: (cb): IntervalHandle => callbacks.push(cb),
      clearInterval: () => {},
    };
    const timer = new Timer(clock, scheduler);
    let expired = 0;
    let ticks = 0;
    timer.onTick(() => ticks++);
    timer.onExpire(() => expired++);
    timer.start();
    timer.stop();
    clock.advanceBoth(DURATION_MS + 1000);
    callbacks[0]();
    expect(ticks).toBe(0);
    expect(expired).toBe(0);
  });
});
