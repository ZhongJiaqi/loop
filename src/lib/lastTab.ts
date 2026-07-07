import { TODAY_TABS, type TodayTabKey } from './todayTabs';

/** localStorage key remembering which Today sub-tab the user last viewed. */
export const LAST_TAB_STORAGE_KEY = 'loop.today.tab';

const DEFAULT_TAB: TodayTabKey = 'affirmation';
const VALID_KEYS = new Set<string>(TODAY_TABS.map((t) => t.key));

/**
 * Read the last-viewed Today sub-tab. Falls back to the first tab
 * (affirmation) when nothing is stored, the value is unrecognized, or
 * localStorage is unavailable (private mode / SSR).
 */
export function readLastTab(): TodayTabKey {
  try {
    const stored = localStorage.getItem(LAST_TAB_STORAGE_KEY);
    if (stored && VALID_KEYS.has(stored)) return stored as TodayTabKey;
  } catch {
    /* localStorage unavailable — use default */
  }
  return DEFAULT_TAB;
}

/** Persist the last-viewed Today sub-tab. Silently no-ops when unavailable. */
export function writeLastTab(key: TodayTabKey): void {
  try {
    localStorage.setItem(LAST_TAB_STORAGE_KEY, key);
  } catch {
    /* localStorage unavailable — nothing to persist */
  }
}
