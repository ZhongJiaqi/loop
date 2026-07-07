/**
 * 测试 History 的"当前连续天数"纯函数 calculateCurrentStreak。
 *
 * 语义：连续"完美日"（当天所有任务全部完成）截止到今天；
 * 若今天还没做完，则宽限到昨天为止（避免大清早连续被清零）。
 * 今天、昨天都不是完美日 → 0。
 */
import { describe, it, expect } from 'vitest';
import { calculateCurrentStreak } from '../src/lib/streak';

const TODAY = new Date('2026-07-07T12:00:00');

describe('calculateCurrentStreak', () => {
  it('今天是完美日 → 连续计到今天', () => {
    const perfect = ['2026-07-05', '2026-07-06', '2026-07-07'];
    expect(calculateCurrentStreak(perfect, TODAY)).toBe(3);
  });

  it('今天未完成但昨天是完美日 → 宽限计到昨天', () => {
    const perfect = ['2026-07-05', '2026-07-06']; // 今天 7/7 不在
    expect(calculateCurrentStreak(perfect, TODAY)).toBe(2);
  });

  it('今天、昨天都不是完美日 → 0', () => {
    const perfect = ['2026-07-03', '2026-07-04'];
    expect(calculateCurrentStreak(perfect, TODAY)).toBe(0);
  });

  it('中间断档只计从锚点起的连续段', () => {
    // 7/7、7/6 连续；7/5 缺 → 断。更早的 7/1、7/2 不计入
    const perfect = ['2026-07-01', '2026-07-02', '2026-07-06', '2026-07-07'];
    expect(calculateCurrentStreak(perfect, TODAY)).toBe(2);
  });

  it('无完美日 → 0', () => {
    expect(calculateCurrentStreak([], TODAY)).toBe(0);
  });

  it('仅今天一天完美 → 1', () => {
    expect(calculateCurrentStreak(['2026-07-07'], TODAY)).toBe(1);
  });
});
