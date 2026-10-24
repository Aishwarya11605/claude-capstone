import { DURATION_MS } from '../config';

export function formatTime(remainingMs: number): string {
  const clamped = Math.min(DURATION_MS, Math.max(0, remainingMs));
  const totalSeconds = Math.ceil(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
