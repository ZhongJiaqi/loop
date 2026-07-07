import { format, subDays } from 'date-fns';

/**
 * 当前连续天数：连续"完美日"截止到今天；今天若还没完成则宽限到昨天。
 *
 * @param perfectDates 完美日的 'yyyy-MM-dd' 列表（当天所有任务全部完成，顺序不限）
 * @param today 今天
 * @returns 连续天数；今天、昨天都不是完美日时为 0
 */
export function calculateCurrentStreak(perfectDates: string[], today: Date): number {
  const set = new Set(perfectDates);
  const todayStr = format(today, 'yyyy-MM-dd');
  const yesterdayStr = format(subDays(today, 1), 'yyyy-MM-dd');

  // 锚点：今天完美则从今天起算；否则昨天完美则从昨天起算（宽限进行中的今天）
  let cursor: Date;
  if (set.has(todayStr)) {
    cursor = today;
  } else if (set.has(yesterdayStr)) {
    cursor = subDays(today, 1);
  } else {
    return 0;
  }

  let count = 0;
  while (set.has(format(cursor, 'yyyy-MM-dd'))) {
    count++;
    cursor = subDays(cursor, 1);
  }
  return count;
}
