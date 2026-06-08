import { describe, it, expect } from 'vitest';
import { MOOD_BUCKETS, bucketById } from '../src/lib/moods';

describe('MOOD_BUCKETS canonical data', () => {
  it('has exactly 9 buckets in canonical order', () => {
    expect(MOOD_BUCKETS).toHaveLength(9);
    expect(MOOD_BUCKETS.map((b) => b.id)).toEqual([
      'bukar',
      'bitter',
      'fear',
      'greed',
      'anger',
      'pride',
      'brave',
      'accept',
      'peace',
    ]);
  });

  it('every bucket has zhName, motive, color (#XXXXXX), non-empty words', () => {
    for (const b of MOOD_BUCKETS) {
      expect(b.zhName.length).toBeGreaterThan(0);
      expect(typeof b.motive).toBe('string');
      expect(b.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(b.words.length).toBeGreaterThan(0);
    }
  });
});

describe('bucketById', () => {
  it('returns matching bucket by id', () => {
    expect(bucketById('fear').zhName).toBe('恐惧');
    expect(bucketById('peace').zhName).toBe('平和');
  });
});
