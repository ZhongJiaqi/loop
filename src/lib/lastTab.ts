import { TODAY_TABS, type TodayTabKey } from './todayTabs';

/** localStorage keys remembering which module sub-tab the user last viewed. */
export const LAST_TAB_STORAGE_KEY = 'loop.today.tab';
export const PRACTICE_TAB_STORAGE_KEY = 'loop.practice.tab';

const DEFAULT_TAB: TodayTabKey = 'affirmation';
const VALID_KEYS = new Set<string>(TODAY_TABS.map((t) => t.key));

/**
 * Read the last-viewed module sub-tab for the given storage key. Falls back to
 * the first tab (affirmation) when nothing is stored, the value is
 * unrecognized, or localStorage is unavailable (private mode / SSR).
 */
export function readLastTab(
  storageKey: string = LAST_TAB_STORAGE_KEY,
): TodayTabKey {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored && VALID_KEYS.has(stored)) return stored as TodayTabKey;
  } catch {
    /* localStorage unavailable — use default */
  }
  return DEFAULT_TAB;
}

/** Persist the last-viewed module sub-tab. Silently no-ops when unavailable. */
export function writeLastTab(
  key: TodayTabKey,
  storageKey: string = LAST_TAB_STORAGE_KEY,
): void {
  try {
    localStorage.setItem(storageKey, key);
  } catch {
    /* localStorage unavailable — nothing to persist */
  }
}

/**
 * Day-scoped variants for the Today page: the remembered tab only survives
 * within the same day, so each daily reset lands back on the first tab
 * (Affirm). Stored as JSON `{tab, day}`; a legacy day-less value, another
 * day's value, or corrupted data all fall back to the default.
 */
export function readLastTabForDay(
  day: string,
  storageKey: string = LAST_TAB_STORAGE_KEY,
): TodayTabKey {
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored) as { tab?: unknown; day?: unknown };
      if (
        parsed !== null &&
        typeof parsed === 'object' &&
        parsed.day === day &&
        typeof parsed.tab === 'string' &&
        VALID_KEYS.has(parsed.tab)
      ) {
        return parsed.tab as TodayTabKey;
      }
    }
  } catch {
    /* legacy plain string / malformed JSON / localStorage unavailable */
  }
  return DEFAULT_TAB;
}

/** Persist the last-viewed sub-tab together with the day it belongs to. */
export function writeLastTabForDay(
  key: TodayTabKey,
  day: string,
  storageKey: string = LAST_TAB_STORAGE_KEY,
): void {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ tab: key, day }));
  } catch {
    /* localStorage unavailable — nothing to persist */
  }
}
