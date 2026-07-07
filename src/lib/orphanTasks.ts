import { MicroHabit, Task } from '../types';

/**
 * 过滤掉"孤儿任务"——habitId 已无对应习惯的 task（对应习惯被删除后残留的旧记录）。
 *
 * 为什么需要：deleteMicroHabit 只删未完成的 task、保留已完成的作为历史，
 * 于是被删习惯（尤其被删的 mindset）的旧完成记录会变成孤儿。UI 里的
 * `category ?? 'habit'` 兜底会把这些孤儿误归入 Habits 区。从数据源统一排除，
 * 让孤儿不出现在任何区块 / 统计 / 日历里。
 */
export function excludeOrphanTasks(tasks: Task[], habits: MicroHabit[]): Task[] {
  const habitIds = new Set(habits.map((h) => h.id));
  return tasks.filter((t) => habitIds.has(t.habitId));
}
