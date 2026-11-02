import { DURATION_MS, TICK_INTERVAL_MS } from '../config';
import type { Clock, IntervalHandle, Scheduler } from '../platform/clock';

export class Timer {
  private monoStart = 0;
  private wallStart = 0;
  private elapsedMs = 0;
  private started = false;
  private stopped = false;
  private handle: IntervalHandle | null = null;
  private tickListener: (remainingMs: number) => void = () => {};
  private expireListener: () => void = () => {};

  constructor(
    private readonly clock: Clock,
    private readonly scheduler: Scheduler,
  ) {}

  onTick(listener: (remainingMs: number) => void): void {
    this.tickListener = listener;
  }

  onExpire(listener: () => void): void {
    this.expireListener = listener;
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.monoStart = this.clock.now();
    this.wallStart = this.clock.wallNow();
    this.handle = this.scheduler.setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  // For resuming: align internal start points such that remainingMs() reflects an absolute deadline.
  startFromDeadline(deadlineEpochMs: number): void {
    if (this.started) return;
    this.started = true;

    const wallNow = this.clock.wallNow();
    const remaining = Math.max(0, deadlineEpochMs - wallNow);
    const elapsed = Math.max(0, DURATION_MS - remaining);

    // Set starts so that (now - start) == elapsed.
    this.monoStart = this.clock.now() - elapsed;
    this.wallStart = wallNow - elapsed;

    this.handle = this.scheduler.setInterval(() => this.tick(), TICK_INTERVAL_MS);
  }

  stop(): void {
    this.stopped = true;
    if (this.handle !== null) {
      this.scheduler.clearInterval(this.handle);
      this.handle = null;
    }
  }

  remainingMs(): number {
    if (this.started) {
      const monoDelta = this.clock.now() - this.monoStart;
      const wallDelta = this.clock.wallNow() - this.wallStart;
      this.elapsedMs = Math.max(this.elapsedMs, monoDelta, wallDelta);
    }
    return Math.max(0, DURATION_MS - this.elapsedMs);
  }

  tick(): void {
    if (this.stopped || !this.started) return;
    const remaining = this.remainingMs();
    this.tickListener(remaining);
    if (remaining === 0 && !this.stopped) {
      this.stop();
      this.expireListener();
    }
  }
}
