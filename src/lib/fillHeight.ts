import { useLayoutEffect, useState, type RefObject } from 'react';

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

/**
 * Measured bounded height for a view (Today / Practice) that must scroll its own
 * content instead of growing the document. The app scrolls the window (`<main>`
 * grows with content), so a plain `h-full` collapses to content height; this
 * fills from the view's top down to `<main>`'s bottom padding (the fixed-nav
 * clearance) and re-measures on mount, resize, and next frame. Also scrolls the
 * window to the top on (re)entry so a retained scroll never dumps you mid-list.
 *
 * Returns null until the first measurement (one layout-effect tick, pre-paint).
 */
export function useFillHeight(
  rootRef: RefObject<HTMLElement | null>,
): number | null {
  const [fillHeight, setFillHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const main = rootRef.current?.closest('main');
    if (!main) return;
    const recompute = () => {
      const top = main.getBoundingClientRect().top;
      const reserve = parseFloat(getComputedStyle(main).paddingBottom) || 0;
      setFillHeight(computeFillHeight(window.innerHeight, top, reserve));
    };
    window.scrollTo(0, 0);
    recompute();
    const raf = requestAnimationFrame(recompute);
    window.addEventListener('resize', recompute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', recompute);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return fillHeight;
}
