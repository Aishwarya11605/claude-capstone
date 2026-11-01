export interface Clock {
  now(): number;
  wallNow(): number;
}

export type IntervalHandle = number;

export interface Scheduler {
  setInterval(callback: () => void, intervalMs: number): IntervalHandle;
  clearInterval(handle: IntervalHandle): void;
}

export interface VisibilitySource {
  subscribe(listener: () => void): () => void;
}

export const realClock: Clock = {
  now: () => performance.now(),
  wallNow: () => Date.now(),
};

export const realScheduler: Scheduler = {
  setInterval: (callback, intervalMs) => window.setInterval(callback, intervalMs),
  clearInterval: (handle) => window.clearInterval(handle),
};

export const realVisibility: VisibilitySource = {
  subscribe(listener) {
    document.addEventListener('visibilitychange', listener);
    return () => document.removeEventListener('visibilitychange', listener);
  },
};
