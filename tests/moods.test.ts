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

import { formatEntryTime, groupEntriesByDay, formatDayLabel } from '../src/lib/moodFormat';
import type { MoodEntry } from '../src/types';

describe('formatEntryTime', () => {
  it('formats ISO to "HH:mm" 24h', () => {
    expect(formatEntryTime('2026-06-08T14:32:00.000Z', 'UTC')).toBe('14:32');
    expect(formatEntryTime('2026-06-08T09:05:00.000Z', 'UTC')).toBe('09:05');
  });
});

describe('formatDayLabel', () => {
  const today = new Date('2026-06-08T12:00:00.000Z');
  it('returns "今天 · M/D Ddd" for today', () => {
    expect(formatDayLabel('2026-06-08', today)).toBe('今天 · 6/8 Mon');
  });
  it('returns "昨天 · M/D Ddd"', () => {
    expect(formatDayLabel('2026-06-07', today)).toBe('昨天 · 6/7 Sun');
  });
  it('returns "前天 · M/D Ddd"', () => {
    expect(formatDayLabel('2026-06-06', today)).toBe('前天 · 6/6 Sat');
  });
  it('returns "M/D Ddd" for 4+ days ago', () => {
    expect(formatDayLabel('2026-06-04', today)).toBe('6/4 Thu');
  });
  it('returns "YYYY/M/D Ddd" for cross-year', () => {
    expect(formatDayLabel('2025-12-31', today)).toBe('2025/12/31 Wed');
  });
});

describe('groupEntriesByDay', () => {
  const mk = (id: string, iso: string): MoodEntry => ({
    id,
    userId: 'u',
    bucket: 'fear',
    words: [],
    createdAt: iso,
  });
  it('groups entries by YYYY-MM-DD in UTC and preserves desc order within day', () => {
    const entries = [
      mk('1', '2026-06-08T14:32:00.000Z'),
      mk('2', '2026-06-08T11:08:00.000Z'),
      mk('3', '2026-06-07T22:15:00.000Z'),
    ];
    const groups = groupEntriesByDay(entries, 'UTC');
    expect(groups).toHaveLength(2);
    expect(groups[0].date).toBe('2026-06-08');
    expect(groups[0].entries.map((e) => e.id)).toEqual(['1', '2']);
    expect(groups[1].date).toBe('2026-06-07');
  });
  it('empty input returns empty array', () => {
    expect(groupEntriesByDay([], 'UTC')).toEqual([]);
  });
});
