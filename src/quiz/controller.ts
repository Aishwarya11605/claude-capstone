import { DURATION_MS } from '../config';
import type { Clock, Scheduler, VisibilitySource } from '../platform/clock';
import { computeDatasetSignature } from './datasetSignature';
import { loadAttempt, saveAttempt, safeClearAttempt } from './persistence';
import * as machine from './quizMachine';
import { Timer } from './timer';
import type { Answers, Dataset, QuizState, SubmitReason } from './types';

export interface ControllerDeps {
  clock: Clock;
  scheduler: Scheduler;
  visibility: VisibilitySource;
  announce: (text: string) => void;
}

export type ControllerListener = (state: QuizState, remainingMs: number) => void;

export type SavedAttemptStatus =
  | { status: 'none' }
  | { status: 'available' }
  | { status: 'unavailable' | 'corrupt' | 'incompatible' | 'expired' };

export class Controller {
  private state: QuizState = machine.createInitialState();
  private timer: Timer | null = null;
  private remaining = DURATION_MS;
  private listeners = new Set<ControllerListener>();
  private readonly unsubscribeVisibility: () => void;

  private readonly datasetSignature: string;

  private savedAttemptAvailable = false;
  private savedAttemptStatus: SavedAttemptStatus = { status: 'none' };
  private savedDeadlineEpochMs: number | null = null;

  constructor(
    private readonly dataset: Dataset,
    private readonly deps: ControllerDeps,
  ) {
    this.unsubscribeVisibility = deps.visibility.subscribe(() => this.timer?.tick());
    this.datasetSignature = computeDatasetSignature(dataset);

    // Opportunistically check for an attempt on startup so the UI can offer Resume.
    const loaded = loadAttempt(this.deps.clock.wallNow(), this.datasetSignature);
    if (loaded.status === 'ok') {
      this.savedAttemptAvailable = true;
      this.savedAttemptStatus = { status: 'available' };
      this.savedDeadlineEpochMs = loaded.attempt.deadlineEpochMs;
    } else {
      this.savedAttemptAvailable = false;
      this.savedDeadlineEpochMs = null;
      this.savedAttemptStatus =
        loaded.status === 'none' || loaded.status === 'ok' ? { status: 'none' } : { status: loaded.status };
    }
  }

  getState(): QuizState {
    return this.state;
  }

  getRemainingMs(): number {
    return this.remaining;
  }

  getSavedAttemptStatus(): SavedAttemptStatus {
    return this.savedAttemptStatus;
  }

  hasSavedAttempt(): boolean {
    return this.savedAttemptAvailable;
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
    this.beginNewAttempt();
    this.notify();
  }

  resume(): void {
    // Only resume from idle.
    if (this.state.status !== 'idle') return;

    const loaded = loadAttempt(this.deps.clock.wallNow(), this.datasetSignature);
    if (loaded.status !== 'ok') {
      // Attempt disappeared or became invalid since startup.
      this.savedAttemptAvailable = false;
      this.savedAttemptStatus = loaded.status === 'none' ? { status: 'none' } : { status: loaded.status };
      this.notify();
      return;
    }

    this.savedAttemptAvailable = true;
    this.savedAttemptStatus = { status: 'available' };
    this.savedDeadlineEpochMs = loaded.attempt.deadlineEpochMs;

    this.state = { status: 'active', answers: loaded.attempt.answers, result: null };
    this.beginAttemptFromDeadline(loaded.attempt.deadlineEpochMs);
    this.notify();
  }

  startOver(): void {
    safeClearAttempt();
    this.savedAttemptAvailable = false;
    this.savedAttemptStatus = { status: 'none' };
    this.savedDeadlineEpochMs = null;

    // Reset state to match normal initial view.
    this.timer?.stop();
    this.timer = null;
    this.remaining = DURATION_MS;
    this.state = machine.createInitialState();
    this.notify();
  }

  select(questionId: string, optionId: string): void {
    if (this.routeIfPastDeadline()) return;
    const next = machine.select(this.state, questionId, optionId);
    if (next === this.state) return;
    this.state = next;

    if (this.state.status === 'active') this.persistActiveAttempt(this.state.answers);
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
    this.beginNewAttempt();
    this.notify();
  }

  private beginNewAttempt(): void {
    const deadline = this.deps.clock.wallNow() + DURATION_MS;
    this.beginAttemptFromDeadline(deadline);
    if (this.state.status === 'active') this.persistActiveAttempt(this.state.answers);
  }

  private beginAttemptFromDeadline(deadlineEpochMs: number): void {
    // Timer uses both monotonic and wall clock; for resume we need to align wallStart such that
    // remainingMs() derives the correct remaining time.
    this.remaining = Math.max(0, deadlineEpochMs - this.deps.clock.wallNow());

    const timer = new Timer(this.deps.clock, this.deps.scheduler);
    timer.onTick((remainingMs) => this.handleTick(remainingMs, deadlineEpochMs));
    timer.onExpire(() => this.finish('timeout'));

    // align the timer's internal start points to treat current moment as "now".
    timer.startFromDeadline(deadlineEpochMs);

    this.timer = timer;

    // Mark saved attempt data as representing the active attempt.
    this.savedAttemptAvailable = true;
    this.savedAttemptStatus = { status: 'available' };
    this.savedDeadlineEpochMs = deadlineEpochMs;
  }

  private persistActiveAttempt(answers: Answers): void {
    if (this.state.status !== 'active') return;
    if (this.savedDeadlineEpochMs === null) return;

    try {
      saveAttempt({
        schemaVersion: 1,
        datasetSignature: this.datasetSignature,
        deadlineEpochMs: this.savedDeadlineEpochMs,
        answers,
      });
    } catch {
      // If storage fails, keep the quiz usable.
      this.savedAttemptStatus = { status: 'unavailable' };
    }
  }

  private routeIfPastDeadline(): boolean {
    if (this.state.status !== 'active' || !this.timer) return false;
    if (this.timer.remainingMs() > 0) return false;
    this.finish('timeout');
    return true;
  }

  private handleTick(remainingMs: number, deadlineEpochMs: number): void {
    if (this.state.status !== 'active') return;
    this.remaining = remainingMs;

    // keep deadline persisted (in case browser throttled and remaining jumps)
    this.savedDeadlineEpochMs = deadlineEpochMs;
    this.persistActiveAttempt(this.state.answers);

    this.notify();
  }

  private finish(reason: SubmitReason): void {
    if (this.state.status !== 'active' || !this.timer) return;
    const remainingMs = reason === 'timeout' ? 0 : this.timer.remainingMs();
    this.timer.stop();
    this.state = machine.submit(this.state, this.dataset.questions, reason, remainingMs);
    this.remaining = remainingMs;

    // Clear persisted attempt on completion.
    safeClearAttempt();
    this.savedAttemptAvailable = false;
    this.savedAttemptStatus = { status: 'none' };
    this.savedDeadlineEpochMs = null;

    this.notify();

    const result = this.state.result;
    if (result) {
      const scoreText = `Your score is ${result.score} out of ${result.total}`;
      this.deps.announce(scoreText);
    }
  }

  private notify(): void {
    for (const listener of [...this.listeners]) listener(this.state, this.remaining);
  }
}
