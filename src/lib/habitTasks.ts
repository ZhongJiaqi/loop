import { Task } from '../types';

/**
 * 一个习惯名下的全部 task。删除习惯时用它删掉**所有** task（含已完成），
 * 避免残留已完成记录变成孤儿脏数据。
 */
export function tasksForHabit(tasks: Task[], habitId: string): Task[] {
  return tasks.filter((t) => t.habitId === habitId);
}
