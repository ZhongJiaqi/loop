export type MicroHabitCategory = 'habit' | 'affirmation' | 'mindset';

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

// === Mood (觉察空间) ===
// 设计 doc: docs/superpowers/specs/2026-06-08-mood-design.html
export type MoodBucketId =
  | 'bukar' // 万念俱灰
  | 'bitter' // 悲苦
  | 'fear' // 恐惧
  | 'greed' // 贪求
  | 'anger' // 愤怒
  | 'pride' // 自尊自傲
  | 'brave' // 无畏
  | 'accept' // 接纳
  | 'peace'; // 平和

export interface MoodBucket {
  id: MoodBucketId;
  zhName: string;
  motive: string;
  color: string; // hex #RRGGBB
  words: readonly string[];
}

export interface MoodEntry {
  id: string;
  userId: string;
  bucket: MoodBucketId;
  words: string[];
  createdAt: string; // ISO
  updatedAt?: string;
}
