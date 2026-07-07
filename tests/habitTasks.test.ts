/**
 * 测试 tasksForHabit —— 删除习惯时要删掉的 task 集合。
 *
 * 根治 bug：旧的 deleteMicroHabit 只删未完成 task、保留已完成的，
 * 导致被删习惯的完成记录变成孤儿脏数据。正确：删习惯 = 删它的**全部** task。
 */
import { describe, it, expect } from 'vitest';
import { tasksForHabit } from '../src/lib/habitTasks';
import type { Task } from '../src/types';

let seq = 0;
const task = (habitId: string, completed: boolean): Task => ({
  id: `t${seq++}`,
  title: `task-${habitId}`,
  date: '2026-07-07',
  completed,
  habitId,
  userId: 'u',
});

describe('tasksForHabit', () => {
  it('返回该习惯的全部 task —— 已完成 + 未完成都要（删习惯不留孤儿）', () => {
    const tasks = [task('h1', true), task('h1', false), task('h2', true)];
    const out = tasksForHabit(tasks, 'h1');
    expect(out).toHaveLength(2);
    expect(out.every((t) => t.habitId === 'h1')).toBe(true);
    expect(out.map((t) => t.completed).sort()).toEqual([false, true]);
  });

  it('习惯没有任何 task 时返回空', () => {
    expect(tasksForHabit([task('h1', true)], 'ghost')).toEqual([]);
  });
});
