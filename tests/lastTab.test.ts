// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import {
  readLastTab,
  writeLastTab,
  readLastTabForDay,
  writeLastTabForDay,
  LAST_TAB_STORAGE_KEY,
  PRACTICE_TAB_STORAGE_KEY,
} from '../src/lib/lastTab';

/**
 * vitest 4.x's jsdom sometimes ships an incomplete localStorage. Install a real
 * in-memory Storage so we exercise genuine read/write round-trips (not mocks).
 */
function installMemoryStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    writable: true,
    value: {
      getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
      setItem: (k: string, v: string) => void map.set(k, String(v)),
      removeItem: (k: string) => void map.delete(k),
      clear: () => map.clear(),
      key: (i: number) => Array.from(map.keys())[i] ?? null,
      get length() {
        return map.size;
      },
    },
  });
}

describe('lastTab persistence', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it('defaults to the affirmation tab when nothing is stored', () => {
    expect(readLastTab()).toBe('affirmation');
  });

  it('round-trips a written tab key', () => {
    writeLastTab('mindset');
    expect(readLastTab()).toBe('mindset');
  });

  it('ignores an unknown stored value and falls back to affirmation', () => {
    localStorage.setItem(LAST_TAB_STORAGE_KEY, 'garbage');
    expect(readLastTab()).toBe('affirmation');
  });

  it('persists under the loop.today.tab key', () => {
    writeLastTab('habit');
    expect(localStorage.getItem(LAST_TAB_STORAGE_KEY)).toBe('habit');
    expect(LAST_TAB_STORAGE_KEY).toBe('loop.today.tab');
  });

  it('round-trips under a caller-supplied storage key (Practice)', () => {
    expect(PRACTICE_TAB_STORAGE_KEY).toBe('loop.practice.tab');
    writeLastTab('habit', PRACTICE_TAB_STORAGE_KEY);
    expect(readLastTab(PRACTICE_TAB_STORAGE_KEY)).toBe('habit');
  });

  it('keeps the Today and Practice tabs independent', () => {
    writeLastTab('mindset'); // Today (default key)
    writeLastTab('habit', PRACTICE_TAB_STORAGE_KEY); // Practice
    expect(readLastTab()).toBe('mindset');
    expect(readLastTab(PRACTICE_TAB_STORAGE_KEY)).toBe('habit');
  });
});

describe('day-scoped lastTab (Today defaults back to Affirm each new day)', () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  it('remembers the tab within the same day', () => {
    writeLastTabForDay('mindset', '2026-07-13');
    expect(readLastTabForDay('2026-07-13')).toBe('mindset');
  });

  it('falls back to affirmation when the stored day differs (daily reset)', () => {
    writeLastTabForDay('habit', '2026-07-12');
    expect(readLastTabForDay('2026-07-13')).toBe('affirmation');
  });

  it('defaults to affirmation when nothing is stored', () => {
    expect(readLastTabForDay('2026-07-13')).toBe('affirmation');
  });

  it('treats a legacy day-less value as stale and defaults to affirmation', () => {
    localStorage.setItem(LAST_TAB_STORAGE_KEY, 'mindset');
    expect(readLastTabForDay('2026-07-13')).toBe('affirmation');
  });

  it('ignores malformed JSON and unknown tab values', () => {
    localStorage.setItem(LAST_TAB_STORAGE_KEY, '{broken');
    expect(readLastTabForDay('2026-07-13')).toBe('affirmation');
    localStorage.setItem(
      LAST_TAB_STORAGE_KEY,
      JSON.stringify({ tab: 'garbage', day: '2026-07-13' }),
    );
    expect(readLastTabForDay('2026-07-13')).toBe('affirmation');
  });

  it('leaves the Practice key (day-free memory) untouched', () => {
    writeLastTab('habit', PRACTICE_TAB_STORAGE_KEY);
    writeLastTabForDay('mindset', '2026-07-13');
    expect(readLastTab(PRACTICE_TAB_STORAGE_KEY)).toBe('habit');
    expect(readLastTabForDay('2026-07-13')).toBe('mindset');
  });
});
