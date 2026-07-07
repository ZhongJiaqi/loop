// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { readLastTab, writeLastTab, LAST_TAB_STORAGE_KEY } from '../src/lib/lastTab';

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
});
