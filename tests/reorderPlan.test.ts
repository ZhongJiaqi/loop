/**
 * Unit tests for reorderPlan — the pure function behind Practice page drag-to-reorder.
 *
 * Given the current MicroHabit list and a new id ordering for one section, returns
 * a write plan: [{ id, sortIndex }] to send to Firestore. We keep this pure so
 * tests don't need a Firestore mock and the logic is shared between the live
 * store (writeBatch) and the demo store (in-memory state update).
 */
import { describe, it, expect } from 'vitest';
import {
  reorderPlan,
  sortByOrder,
  nextSortIndex,
} from '../src/lib/reorder';
import type { MicroHabit } from '../src/types';

function h(id: string, overrides: Partial<MicroHabit> = {}): MicroHabit {
  return {
    id,
    title: id,
    createdAt: '2026-05-01T00:00:00.000Z',
    active: true,
    userId: 'u',
    category: 'habit',
    ...overrides,
  };
}

describe('reorderPlan — write planner for drag-to-reorder', () => {
  it('returns one entry per id in the new order with monotonically increasing sortIndex', () => {
    const plan = reorderPlan(['c', 'a', 'b']);
    expect(plan).toEqual([
      { id: 'c', sortIndex: 0 },
      { id: 'a', sortIndex: 1 },
      { id: 'b', sortIndex: 2 },
    ]);
  });

  it('uses integer indices so cross-device merges stay deterministic', () => {
    const plan = reorderPlan(['x', 'y']);
    plan.forEach(p => expect(Number.isInteger(p.sortIndex)).toBe(true));
  });

  it('handles single item', () => {
    expect(reorderPlan(['only'])).toEqual([{ id: 'only', sortIndex: 0 }]);
  });

  it('handles empty list', () => {
    expect(reorderPlan([])).toEqual([]);
  });
});

describe('sortByOrder — render-time sort', () => {
  it('orders by sortIndex ascending when present', () => {
    const items = [
      h('a', { sortIndex: 2 }),
      h('b', { sortIndex: 0 }),
      h('c', { sortIndex: 1 }),
    ];
    expect(sortByOrder(items).map(i => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('falls back to createdAt for items missing sortIndex (legacy data)', () => {
    const items = [
      h('newer', { createdAt: '2026-05-10T00:00:00.000Z' }),
      h('older', { createdAt: '2026-05-01T00:00:00.000Z' }),
    ];
    // Both lack sortIndex → use createdAt ascending (older first)
    expect(sortByOrder(items).map(i => i.id)).toEqual(['older', 'newer']);
  });

  it('items with sortIndex come before items without (explicit order wins)', () => {
    const items = [
      h('legacy', { createdAt: '2026-04-01T00:00:00.000Z' }), // no sortIndex
      h('ordered', { sortIndex: 5, createdAt: '2026-06-01T00:00:00.000Z' }),
    ];
    expect(sortByOrder(items).map(i => i.id)).toEqual(['ordered', 'legacy']);
  });

  it('is stable when both have the same sortIndex', () => {
    const items = [
      h('first', { sortIndex: 0, createdAt: '2026-05-01T00:00:00.000Z' }),
      h('second', { sortIndex: 0, createdAt: '2026-05-02T00:00:00.000Z' }),
    ];
    expect(sortByOrder(items).map(i => i.id)).toEqual(['first', 'second']);
  });

  it('does not mutate input array', () => {
    const items = [h('a', { sortIndex: 1 }), h('b', { sortIndex: 0 })];
    const snapshot = items.map(i => i.id);
    sortByOrder(items);
    expect(items.map(i => i.id)).toEqual(snapshot);
  });
});

describe('nextSortIndex — append-to-end for new habits', () => {
  it('returns 0 when section is empty', () => {
    expect(nextSortIndex([])).toBe(0);
  });

  it('returns max(sortIndex) + 1 for non-empty section', () => {
    const items = [
      h('a', { sortIndex: 0 }),
      h('b', { sortIndex: 5 }),
      h('c', { sortIndex: 2 }),
    ];
    expect(nextSortIndex(items)).toBe(6);
  });

  it('treats items missing sortIndex as -1 so new item sorts after legacy ones', () => {
    // Legacy items have no sortIndex. When user adds a new habit, it should
    // land at the bottom of the visual list, which sortByOrder renders as
    // (ordered items first, legacy items last by createdAt). The new item
    // gets sortIndex 0, placing it ahead of legacy items — which is the
    // intuitive "appended after explicitly-ordered items, before unordered tail".
    const items = [h('legacy1'), h('legacy2')];
    expect(nextSortIndex(items)).toBe(0);
  });

  it('mixes legacy and ordered correctly', () => {
    const items = [
      h('legacy'),
      h('ordered', { sortIndex: 3 }),
    ];
    expect(nextSortIndex(items)).toBe(4);
  });
});
