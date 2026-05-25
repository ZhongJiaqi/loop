export type MicroHabitCategory = 'habit' | 'affirmation';

export interface MicroHabit {
  id: string;
  title: string;
  createdAt: string; // ISO string
  active: boolean;
  userId: string;
  category: MicroHabitCategory;
  /**
   * Per-category render order. Set by drag-to-reorder on the Practice page.
   * Lower = earlier in the list. Optional because pre-2026-05-25 documents
   * lack the field — `sortByOrder` falls back to createdAt for those.
   */
  sortIndex?: number;
}

export interface Task {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  habitId: string; // 现在必填，所有 task 都来自 habit
  userId: string;
}
