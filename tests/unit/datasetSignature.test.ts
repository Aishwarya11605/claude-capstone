import { describe, expect, it } from 'vitest';
import { computeDatasetSignature } from '../../src/quiz/datasetSignature';
import { stableStringify } from '../../src/util/stableStringify';

describe('datasetSignature + stableStringify', () => {
  it('stableStringify sorts keys to produce deterministic output', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe('{"a":1,"b":2}');
  });

  it('stableStringify throws on circular structures', () => {
    const o: any = { a: 1 };
    o.self = o;
    expect(() => stableStringify(o)).toThrow(/circular/i);
  });

  it('computeDatasetSignature is deterministic and key-order insensitive', () => {
    const a = { x: 1, y: { b: 2, a: 3 } };
    const b = { y: { a: 3, b: 2 }, x: 1 };
    expect(computeDatasetSignature(a)).toEqual(computeDatasetSignature(b));
  });

  it('computeDatasetSignature changes when data changes', () => {
    const sig1 = computeDatasetSignature({ a: 1 });
    const sig2 = computeDatasetSignature({ a: 2 });
    expect(sig1).not.toEqual(sig2);
  });
});
