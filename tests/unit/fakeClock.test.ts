import { describe, expect, it } from 'vitest';
import { FakeClock, FakeScheduler, FakeVisibility } from './helpers/fakeClock';

describe('FakeClock and FakeScheduler', () => {
  it('fires interval callbacks at the right virtual times', () => {
    const clock = new FakeClock();
    const scheduler = new FakeScheduler(clock);
    const times: number[] = [];
    scheduler.setInterval(() => times.push(clock.now()), 250);
    clock.advanceBoth(1000);
    expect(times).toEqual([250, 500, 750, 1000]);
    expect(clock.now()).toBe(1000);
  });

  it('does not fire cleared intervals', () => {
    const clock = new FakeClock();
    const scheduler = new FakeScheduler(clock);
    let calls = 0;
    const handle = scheduler.setInterval(() => calls++, 100);
    clock.advanceBoth(250);
    scheduler.clearInterval(handle);
    clock.advanceBoth(1000);
    expect(calls).toBe(2);
    expect(scheduler.activeCount).toBe(0);
  });

  it('advanceMono leaves the wall clock alone and advanceBoth moves both', () => {
    const clock = new FakeClock();
    const wall = clock.wallNow();
    clock.advanceMono(500);
    expect(clock.wallNow()).toBe(wall);
    clock.advanceBoth(500);
    expect(clock.wallNow()).toBe(wall + 500);
    clock.setWall(wall - 1000);
    expect(clock.wallNow()).toBe(wall - 1000);
  });

  it('jumpBoth moves time without firing callbacks and fireAll fires once', () => {
    const clock = new FakeClock();
    const scheduler = new FakeScheduler(clock);
    let calls = 0;
    scheduler.setInterval(() => calls++, 250);
    clock.jumpBoth(10_000);
    expect(calls).toBe(0);
    scheduler.fireAll();
    expect(calls).toBe(1);
  });
});

describe('FakeVisibility', () => {
  it('calls subscribers on fire and stops after unsubscribe', () => {
    const visibility = new FakeVisibility();
    let calls = 0;
    const unsubscribe = visibility.subscribe(() => calls++);
    visibility.fire();
    unsubscribe();
    visibility.fire();
    expect(calls).toBe(1);
    expect(visibility.listenerCount).toBe(0);
  });
});
