import type { MicroHabit } from '../types';

export interface SortIndexUpdate {
  id: string;
  sortIndex: number;
}

/**
 * Given the new id order for one section, returns the Firestore write plan:
 * each id mapped to a fresh contiguous sortIndex (0..n-1).
 *
 * We re-index the whole section on every drop rather than computing fractional
 * indices between neighbors. With 4-8 habits per section, the batch write is
 * cheap and avoids precision drift over many reorders.
 */
export function reorderPlan(orderedIds: string[]): SortIndexUpdate[] {
  return orderedIds.map((id, index) => ({ id, sortIndex: index }));
}

/**
 * Sorts MicroHabit[] for rendering. Items with an explicit sortIndex come
 * first (ascending). Items without — legacy data from before this feature
 * shipped — fall to the tail, ordered by createdAt so they stay stable.
 */
export function sortByOrder(items: MicroHabit[]): MicroHabit[] {
  return [...items].sort((a, b) => {
    const aHas = typeof a.sortIndex === 'number';
    const bHas = typeof b.sortIndex === 'number';
    if (aHas && bHas) return a.sortIndex! - b.sortIndex!;
    if (aHas) return -1;
    if (bHas) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

/**
 * sortIndex for a newly-created habit so it lands at the end of its section.
 * Returns max(sortIndex) + 1, or 0 if no item in the section has a sortIndex.
 *
 * Legacy items (no sortIndex) sort to the tail via sortByOrder, so a new
 * item with sortIndex 0 still visually appears before them when no other
 * ordered items exist. Once any item is explicitly reordered, the section
 * gets fully reindexed and this asymmetry resolves.
 */
export function nextSortIndex(sectionItems: MicroHabit[]): number {
  const indices = sectionItems
    .map(h => h.sortIndex)
    .filter((n): n is number => typeof n === 'number');
  if (indices.length === 0) return 0;
  return Math.max(...indices) + 1;
}
