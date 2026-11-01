// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { realVisibility } from '../../src/platform/clock';

function fire(): void {
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('realVisibility', () => {
  it('runs the listener when visibilitychange is dispatched on the document', () => {
    const listener = vi.fn();
    const unsubscribe = realVisibility.subscribe(listener);
    fire();
    expect(listener).toHaveBeenCalledTimes(1);
    fire();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
  });

  it('stops calling the listener after unsubscribe', () => {
    const listener = vi.fn();
    const unsubscribe = realVisibility.subscribe(listener);
    unsubscribe();
    fire();
    expect(listener).not.toHaveBeenCalled();
  });

  it('keeps separate subscriptions independent', () => {
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = realVisibility.subscribe(first);
    const unsubscribeSecond = realVisibility.subscribe(second);
    unsubscribeFirst();
    fire();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
    unsubscribeSecond();
  });
});
