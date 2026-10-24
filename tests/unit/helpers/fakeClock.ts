import type { Clock, IntervalHandle, Scheduler, VisibilitySource } from '../../../src/platform/clock';

interface Ticker {
  nextDue(): number | null;
  runDue(now: number): void;
}

export class FakeClock implements Clock {
  private mono = 0;
  private wall = 1_700_000_000_000;
  private ticker: Ticker | null = null;

  now(): number {
    return this.mono;
  }

  wallNow(): number {
    return this.wall;
  }

  attach(ticker: Ticker): void {
    this.ticker = ticker;
  }

  setWall(value: number): void {
    this.wall = value;
  }

  advanceMono(ms: number): void {
    this.advance(ms, false);
  }

  advanceBoth(ms: number): void {
    this.advance(ms, true);
  }

  jumpBoth(ms: number): void {
    this.mono += ms;
    this.wall += ms;
  }

  private advance(ms: number, both: boolean): void {
    const target = this.mono + ms;
    for (;;) {
      const due = this.ticker?.nextDue() ?? null;
      const next = due !== null && due <= target ? due : target;
      if (both) this.wall += next - this.mono;
      this.mono = next;
      if (next === target && (due === null || due > target)) return;
      this.ticker?.runDue(this.mono);
    }
  }
}

interface FakeInterval {
  id: IntervalHandle;
  every: number;
  next: number;
  callback: () => void;
}

export class FakeScheduler implements Scheduler, Ticker {
  private intervals: FakeInterval[] = [];
  private nextId = 1;

  constructor(private readonly clock: FakeClock) {
    clock.attach(this);
  }

  setInterval(callback: () => void, intervalMs: number): IntervalHandle {
    const id = this.nextId++;
    this.intervals.push({ id, every: intervalMs, next: this.clock.now() + intervalMs, callback });
    return id;
  }

  clearInterval(handle: IntervalHandle): void {
    this.intervals = this.intervals.filter((interval) => interval.id !== handle);
  }

  get activeCount(): number {
    return this.intervals.length;
  }

  nextDue(): number | null {
    if (this.intervals.length === 0) return null;
    return Math.min(...this.intervals.map((interval) => interval.next));
  }

  runDue(now: number): void {
    for (const interval of [...this.intervals]) {
      if (interval.next <= now && this.intervals.includes(interval)) {
        interval.next += interval.every;
        interval.callback();
      }
    }
  }

  fireAll(): void {
    const now = this.clock.now();
    for (const interval of [...this.intervals]) {
      if (this.intervals.includes(interval)) {
        interval.next = now + interval.every;
        interval.callback();
      }
    }
  }
}

export class FakeVisibility implements VisibilitySource {
  private listeners = new Set<() => void>();

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  fire(): void {
    for (const listener of [...this.listeners]) listener();
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}
