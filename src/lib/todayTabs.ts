import type { Task, MicroHabitCategory } from '../types';

/**
 * The three Today sub-tabs, in BE → THINK → DO order (Dilts logical levels):
 * Affirmation (identity) → Mindset (belief) → Habit (action).
 *
 * `color` is the semantic accent used by the tab progress underline, the sub
 * explanation row, and the task checkboxes. Dusk palette: Mindset moved from
 * the old 雾蓝 #7B95B5 to 藕荷 #B48AA0; Affirmation / Habit keep their values
 * (their Dusk targets differ by <3% and read identically).
 */
export type TodayTabKey = Extract<
  MicroHabitCategory,
  'affirmation' | 'mindset' | 'habit'
>;

export interface TodayTabMeta {
  key: TodayTabKey;
  name: string; // long name (accessible label): "Affirmations"
  label: string; // short display label (uppercased in UI): "Affirm"
  sub: string; // italic serif explanation row
  color: string; // semantic accent hex
}

export const TODAY_TABS: readonly TodayTabMeta[] = [
  {
    key: 'affirmation',
    name: 'Affirmations',
    label: 'Affirm',
    sub: 'Identity · who I am',
    color: '#C9A961',
  },
  {
    key: 'mindset',
    name: 'Mindsets',
    label: 'Mindset',
    sub: 'Belief · how I think',
    color: '#B48AA0',
  },
  {
    key: 'habit',
    name: 'Habits',
    label: 'Habits',
    sub: 'Action · what I do',
    color: '#8A9A86',
  },
] as const;

export interface ModuleStats {
  done: number;
  total: number;
  /** Completion percentage 0–100, rounded. 0 when the module has no tasks. */
  pct: number;
}

/** Completion stats for one module's today-tasks. */
export function moduleStats(tasks: Task[]): ModuleStats {
  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}
