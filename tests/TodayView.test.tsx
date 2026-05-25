// @vitest-environment jsdom
/**
 * 锁回归：TodayView 内的 AnimatePresence 必须给所有子节点显式 key。
 *
 * 历史 bug（2026-05-23 修复）：affirmations / habits / empty-state 三个
 * conditional children 都没写 key，demo 场景两组都有数据时 motion.div
 * 同框出现，AnimatePresence 给它们都派默认 "" key，React 抛
 * "Encountered two children with the same key, ``"。
 */
import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { format } from 'date-fns';
import TodayView from '../src/components/TodayView';
import type { Task, MicroHabit } from '../src/types';

function makeStore(microHabits: MicroHabit[], tasks: Task[]) {
  return {
    data: { microHabits, tasks, loaded: true },
    toggleTaskCompletion: vi.fn(),
  };
}

describe('TodayView — React key warnings', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
    cleanup();
  });

  it('fires no duplicate-key warning when both affirmations and habits sections render', () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const microHabits: MicroHabit[] = [
      { id: 'a1', title: 'I am enough.', createdAt: '', active: true, userId: 'u', category: 'affirmation' },
      { id: 'h1', title: '走 30 分钟', createdAt: '', active: true, userId: 'u', category: 'habit' },
    ];
    const tasks: Task[] = [
      { id: `a1_${today}`, title: 'I am enough.', date: today, completed: false, habitId: 'a1', userId: 'u' },
      { id: `h1_${today}`, title: '走 30 分钟', date: today, completed: false, habitId: 'h1', userId: 'u' },
    ];
    const store = makeStore(microHabits, tasks);

    render(React.createElement(TodayView, { store }));

    const dupKeyCalls = errorSpy.mock.calls.filter((args) => {
      const first = args[0];
      return typeof first === 'string' && first.includes('Encountered two children with the same key');
    });
    expect(
      dupKeyCalls,
      `Got ${dupKeyCalls.length} duplicate-key warnings`,
    ).toHaveLength(0);
  });
});
