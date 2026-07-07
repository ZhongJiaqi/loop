import { describe, it, expect } from 'vitest';
import { TODAY_TABS, moduleStats } from '../src/lib/todayTabs';
import type { Task } from '../src/types';

const t = (id: string, completed: boolean): Task => ({
  id,
  title: id,
  date: '2026-07-07',
  completed,
  habitId: id,
  userId: 'u',
});

describe('moduleStats', () => {
  it('returns zeroes for an empty module', () => {
    expect(moduleStats([])).toEqual({ done: 0, total: 0, pct: 0 });
  });

  it('counts done vs total and rounds the percentage', () => {
    expect(moduleStats([t('a', true), t('b', false), t('c', true)])).toEqual({
      done: 2,
      total: 3,
      pct: 67,
    });
  });

  it('is 100% when every task is completed', () => {
    expect(moduleStats([t('a', true), t('b', true)])).toEqual({
      done: 2,
      total: 2,
      pct: 100,
    });
  });

  it('is 0% when nothing is completed', () => {
    expect(moduleStats([t('a', false), t('b', false)])).toEqual({
      done: 0,
      total: 2,
      pct: 0,
    });
  });
});

describe('TODAY_TABS', () => {
  it('orders modules Affirmation → Mindset → Habit (BE → THINK → DO)', () => {
    expect(TODAY_TABS.map((x) => x.key)).toEqual([
      'affirmation',
      'mindset',
      'habit',
    ]);
  });

  it('uses the Dusk 藕荷 color for Mindset', () => {
    const mindset = TODAY_TABS.find((x) => x.key === 'mindset');
    expect(mindset?.color).toBe('#B48AA0');
  });

  it('gives every tab a long name, a short label, and a sub explanation', () => {
    for (const tab of TODAY_TABS) {
      expect(tab.name.length).toBeGreaterThan(0);
      expect(tab.label.length).toBeGreaterThan(0);
      expect(tab.sub.length).toBeGreaterThan(0);
      expect(tab.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });
});
