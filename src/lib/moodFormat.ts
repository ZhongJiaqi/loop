import { formatInTimeZone } from 'date-fns-tz';
import type { MoodEntry } from '../types';

export interface DayGroup {
  date: string; // YYYY-MM-DD（按 timezone 切分）
  entries: MoodEntry[]; // 已按 createdAt desc 排序（继承输入顺序）
}

const DAY_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toDateInTz(iso: string, tz: string): string {
  return formatInTimeZone(iso, tz, 'yyyy-MM-dd');
}

export function formatEntryTime(
  iso: string,
  tz: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): string {
  return formatInTimeZone(iso, tz, 'HH:mm');
}

export function groupEntriesByDay(
  entries: MoodEntry[],
  tz: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): DayGroup[] {
  const map = new Map<string, MoodEntry[]>();
  for (const e of entries) {
    const day = toDateInTz(e.createdAt, tz);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(e);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, list]) => ({ date, entries: list }));
}

export function formatDayLabel(date: string, today: Date = new Date()): string {
  const [y, m, d] = date.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = DAY_OF_WEEK[dt.getUTCDay()];
  const todayY = today.getUTCFullYear();

  const diffDays = Math.round(
    (Date.UTC(todayY, today.getUTCMonth(), today.getUTCDate()) -
      Date.UTC(y, m - 1, d)) /
      86400000,
  );

  const mdLabel = `${m}/${d} ${dow}`;
  if (diffDays === 0) return `今天 · ${mdLabel}`;
  if (diffDays === 1) return `昨天 · ${mdLabel}`;
  if (diffDays === 2) return `前天 · ${mdLabel}`;
  if (y !== todayY) return `${y}/${m}/${d} ${dow}`;
  return mdLabel;
}
