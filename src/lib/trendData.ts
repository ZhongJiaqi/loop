import { subDays, eachDayOfInterval, format, parseISO } from 'date-fns';
import { Task } from '../types';

export type TrendRange = '1w' | '1m' | '3m' | '6m' | '1y' | 'all';

export interface TrendPoint {
  date: string; // yyyy-MM-dd
  completed: number; // 当天完成的任务数
}

const SPAN_DAYS: Record<Exclude<TrendRange, 'all'>, number> = {
  '1w': 7,
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};

/**
 * 把 tasks 压成"每日完成任务数"时间序列，供趋势图渲染。
 * - 每个点的 Y = 当天 completed=true 的任务数
 * - 窗口内每一天都有点（无数据的日子为 0），升序、无间隔
 * - 'all' 从最早任务日期跨到 today；无任务时退化为单点 today
 */
export function buildTrendSeries(
  tasks: Task[],
  range: TrendRange,
  today: Date,
): TrendPoint[] {
  const completedByDate = new Map<string, number>();
  for (const t of tasks) {
    if (t.completed) {
      completedByDate.set(t.date, (completedByDate.get(t.date) ?? 0) + 1);
    }
  }

  let start: Date;
  if (range === 'all') {
    const earliest =
      tasks.length > 0
        ? tasks.reduce((min, t) => (t.date < min ? t.date : min), tasks[0].date)
        : null;
    start = earliest ? parseISO(earliest) : today;
  } else {
    start = subDays(today, SPAN_DAYS[range] - 1);
  }

  return eachDayOfInterval({ start, end: today }).map((day) => {
    const ds = format(day, 'yyyy-MM-dd');
    return { date: ds, completed: completedByDate.get(ds) ?? 0 };
  });
}
