import { describe, expect, it } from 'vitest';
import { formatTime } from '../../src/ui/format';

describe('formatTime', () => {
  it.each([
    [300000, '05:00'],
    [299000, '04:59'],
    [1, '00:01'],
    [0, '00:00'],
    [299999, '05:00'],
    [300001, '05:00'],
    [999999, '05:00'],
    [-500, '00:00'],
    [60000, '01:00'],
    [59001, '01:00'],
  ])('formats %i ms as %s', (ms, expected) => {
    expect(formatTime(ms)).toBe(expected);
  });
});
