// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('bootstrap in main.ts', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.replaceChildren();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.doUnmock('../../src/ui/app');
    vi.restoreAllMocks();
  });

  it('shows the generic error view and no Start button when mountApp throws', async () => {
    vi.doMock('../../src/ui/app', () => ({
      mountApp: () => {
        throw new Error('boom');
      },
    }));
    const root = document.createElement('div');
    root.id = 'app';
    document.body.append(root);

    await import('../../src/main');

    const alert = root.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('Something went wrong');
    expect(root.querySelector('h1')?.textContent).toBe('Something went wrong');
    expect([...root.querySelectorAll('button')]).toHaveLength(0);
    expect(console.error).toHaveBeenCalled();
  });

  it('mounts the Start screen when mountApp succeeds', async () => {
    const root = document.createElement('div');
    root.id = 'app';
    document.body.append(root);

    await import('../../src/main');

    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect([...root.querySelectorAll('button')].some((b) => b.textContent === 'Start Quiz')).toBe(true);
  });
});
