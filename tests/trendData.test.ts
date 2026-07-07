/**
 * 测试 History 趋势图的纯数据变换 buildTrendSeries。
 *
 * 把 tasks 按范围（1周/1月/3月/全部）压成"每日完成任务数"时间序列，
 * 供 TrendChart 画股票走势式面积曲线。逻辑全在这里，SVG 只负责渲染。
 */
import { describe, it, expect } from 'vitest';
import { buildTrendSeries } from '../src/lib/trendData';
import type { Task } from '../src/types';

let seq = 0;
function task(date: string, completed: boolean): Task {
  return { id: `t${seq++}`, title: 't', date, completed, habitId: 'h', userId: 'u' };
}

// 固定 today 让测试确定性（正午避开 DST 边界）
const TODAY = new Date('2026-07-03T12:00:00');

describe('buildTrendSeries', () => {
  it('1周范围返回 7 个每日点，升序，末点为 today', () => {
    const s = buildTrendSeries([], '1w', TODAY);
    expect(s).toHaveLength(7);
    expect(s[0].date).toBe('2026-06-27');
    expect(s[6].date).toBe('2026-07-03');
  });

  it('每个点只统计当天 completed=true 的任务数', () => {
    const tasks = [
      task('2026-07-03', true),
      task('2026-07-03', true),
      task('2026-07-03', false), // 不计
      task('2026-07-02', true),
    ];
    const byDate = Object.fromEntries(
      buildTrendSeries(tasks, '1w', TODAY).map((p) => [p.date, p.completed]),
    );
    expect(byDate['2026-07-03']).toBe(2);
    expect(byDate['2026-07-02']).toBe(1);
    expect(byDate['2026-07-01']).toBe(0);
  });

  it('1月返回 30 点、3月返回 90 点', () => {
    expect(buildTrendSeries([], '1m', TODAY)).toHaveLength(30);
    expect(buildTrendSeries([], '3m', TODAY)).toHaveLength(90);
  });

  it('6月返回 180 点、1年返回 365 点', () => {
    expect(buildTrendSeries([], '6m', TODAY)).toHaveLength(180);
    expect(buildTrendSeries([], '1y', TODAY)).toHaveLength(365);
  });

  it('窗口外的完成任务被排除', () => {
    const tasks = [task('2026-01-01', true)]; // 约半年前
    const s = buildTrendSeries(tasks, '1m', TODAY);
    expect(s.every((p) => p.completed === 0)).toBe(true);
  });

  it('全部范围从最早任务日期跨到 today', () => {
    const tasks = [task('2026-06-30', true), task('2026-07-01', false)];
    const s = buildTrendSeries(tasks, 'all', TODAY);
    expect(s[0].date).toBe('2026-06-30');
    expect(s[s.length - 1].date).toBe('2026-07-03');
    expect(s).toHaveLength(4); // 6/30,7/1,7/2,7/3
    expect(s[0].completed).toBe(1);
  });

  it('全部范围且无任务时，返回单点 today=0', () => {
    const s = buildTrendSeries([], 'all', TODAY);
    expect(s).toHaveLength(1);
    expect(s[0]).toEqual({ date: '2026-07-03', completed: 0 });
  });

  it('点按日期升序、无间隔', () => {
    const s = buildTrendSeries([], '1w', TODAY);
    for (let i = 1; i < s.length; i++) {
      expect(s[i].date > s[i - 1].date).toBe(true);
    }
  });
});
