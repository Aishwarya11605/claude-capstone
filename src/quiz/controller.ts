import { ANNOUNCE_30_MS, ANNOUNCE_60_MS, DURATION_MS, TIMEOUT_NOTICE } from '../config';
import type { Clock, Scheduler, VisibilitySource } from '../platform/clock';
import * as machine from './quizMachine';
import { Timer } from './timer';
import type { Dataset, QuizState, SubmitReason } from './types';

export interface ControllerDeps {
  clock: Clock;
  scheduler: Scheduler;
  visibility: VisibilitySource;
  announce: (text: string) => void;
}

export type ControllerListener = (state: QuizState, remainingMs: number) => void;

export class Controller {
  private state: QuizState = machine.createInitialState();
  private timer: Timer | null = null;
  private remaining = DURATION_MS;
  private announced60 = false;
  private announced30 = false;
  private listeners = new Set<ControllerListener>();
  private readonly unsubscribeVisibility: () => void;

  constructor(
    private readonly dataset: Dataset,
    private readonly deps: ControllerDeps,
  ) {
    this.unsubscribeVisibility = deps.visibility.subscribe(() => this.timer?.tick());
  }

  getState(): QuizState {
    return this.state;
  }

  getRemainingMs(): number {
    return this.remaining;
  }

  subscribe(listener: ControllerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  dispose(): void {
    this.unsubscribeVisibility();
    this.timer?.stop();
    this.listeners.clear();
  }

  start(): void {
    const next = machine.start(this.state);
    if (next === this.state) return;
    this.state = next;
    this.beginAttempt();
    this.notify();
  }

  select(questionId: string, optionId: string): void {
    if (this.routeIfPastDeadline()) return;
    const next = machine.select(this.state, questionId, optionId);
    if (next === this.state) return;
    this.state = next;
    this.notify();
  }

  submit(): void {
    if (this.routeIfPastDeadline()) return;
    this.finish('manual');
  }

  restart(): void {
    const next = machine.restart(this.state);
    if (next === this.state) return;
    this.state = next;
    this.beginAttempt();
    this.notify();
  }

  private beginAttempt(): void {
    this.announced60 = false;
    this.announced30 = false;
    this.remaining = DURATION_MS;
    const timer = new Timer(this.deps.clock, this.deps.scheduler);
    timer.onTick((remainingMs) => this.handleTick(remainingMs));
    timer.onExpire(() => this.finish('timeout'));
    this.timer = timer;
    timer.start();
  }

  private routeIfPastDeadline(): boolean {
    if (this.state.status !== 'active' || !this.timer) return false;
    if (this.timer.remainingMs() > 0) return false;
    this.finish('timeout');
    return true;
  }

  private handleTick(remainingMs: number): void {
    if (this.state.status !== 'active') return;
    this.remaining = remainingMs;
    this.notify();
    if (remainingMs === 0) return;
    if (remainingMs <= ANNOUNCE_30_MS && !this.announced30) {
      this.announced30 = true;
      this.announced60 = true;
      this.deps.announce('30 seconds remaining');
    } else if (remainingMs <= ANNOUNCE_60_MS && !this.announced60) {
      this.announced60 = true;
      this.deps.announce('1 minute remaining');
    }
  }

  private finish(reason: SubmitReason): void {
    if (this.state.status !== 'active' || !this.timer) return;
    const remainingMs = reason === 'timeout' ? 0 : this.timer.remainingMs();
    this.timer.stop();
    this.state = machine.submit(this.state, this.dataset.questions, reason, remainingMs);
    this.remaining = remainingMs;
    this.notify();
    const result = this.state.result;
    if (result) {
      const scoreText = `Your score is ${result.score} out of ${result.total}`;
      this.deps.announce(reason === 'timeout' ? `${TIMEOUT_NOTICE}. ${scoreText}` : scoreText);
    }
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener(this.state, this.remaining);
  }
}
