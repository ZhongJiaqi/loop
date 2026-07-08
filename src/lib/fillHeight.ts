/** Smallest usable content height, so a tiny/odd viewport never collapses it. */
export const MIN_FILL_HEIGHT = 240;

/**
 * Height that makes a content area fill from its top down to the nav-clearance
 * zone, so it manages its own internal scroll instead of growing the document.
 *
 * @param innerHeight   viewport height (`window.innerHeight`)
 * @param contentTop    content area's viewport-relative top (measured at scroll 0)
 * @param bottomReserve px reserved below (the scroll container's bottom padding,
 *                      which clears the fixed bottom nav)
 */
export function computeFillHeight(
  innerHeight: number,
  contentTop: number,
  bottomReserve: number,
): number {
  return Math.max(MIN_FILL_HEIGHT, Math.round(innerHeight - contentTop - bottomReserve));
}
