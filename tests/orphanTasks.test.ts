/**
 * 测试孤儿任务过滤 excludeOrphanTasks。
 *
 * 背景 bug：删除一个习惯时只删未完成的 task、保留已完成的（留作历史），
 * 于是被删习惯的旧 task 变成"孤儿"（habitId 已无对应习惯）。
 * 渲染时 `category ?? 'habit'` 兜底会把孤儿误扫进 Habits 区。
 * 正确做法：从数据源直接排除孤儿，让它们不出现在任何区块/统计里。
 */
import { describe, it, expect } from 'vitest';
import { excludeOrphanTasks } from '../src/lib/orphanTasks';
import type { Task, MicroHabit } from '../src/types';

const habit = (id: string): MicroHabit => ({
  id,
  title: id,
  createdAt: '2026-01-01',
  active: true,
  userId: 'u',
  category: 'habit',
});
const task = (habitId: string, completed = false): Task => ({
  id: `${habitId}_2026-07-07`,
  title: `task-${habitId}`,
  date: '2026-07-07',
  completed,
  habitId,
  userId: 'u',
});

describe('excludeOrphanTasks', () => {
  it('保留 habitId 仍有对应习惯的任务', () => {
    const habits = [habit('h1'), habit('h2')];
    const tasks = [task('h1'), task('h2')];
    expect(excludeOrphanTasks(tasks, habits)).toHaveLength(2);
  });

  it('丢弃孤儿任务（对应习惯已被删除）', () => {
    const habits = [habit('h1')];
    const tasks = [task('h1'), task('ghost', true)]; // ghost = 已删的旧 mindset 习惯
    const out = excludeOrphanTasks(tasks, habits);
    expect(out).toHaveLength(1);
    expect(out[0].habitId).toBe('h1');
  });

  it('没有任何习惯时全部丢弃', () => {
    expect(excludeOrphanTasks([task('h1')], [])).toEqual([]);
  });

  it('空任务返回空', () => {
    expect(excludeOrphanTasks([], [habit('h1')])).toEqual([]);
  });
});
