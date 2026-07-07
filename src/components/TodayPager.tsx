import {
  useEffect,
  useRef,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react';

interface TodayPagerProps {
  index: number;
  onIndexChange: (index: number) => void;
  children: ReactNode[];
}

const SLIDE_TRANSITION = 'transform .34s cubic-bezier(.22,1,.3,1)';
// Axis lock deadzone + rubber-band overscroll clamp (px), ported from mockup.
const AXIS_DEADZONE = 6;
const OVERSCROLL = 46;

/**
 * Horizontal pager for the Today sub-tabs. Renders all pages side-by-side in a
 * flex track and translates the track to reveal the active page. Two ways to
 * move: the parent changes `index` (tab click → animated slide), or the user
 * drags the page left/right. First pointer move locks the axis — horizontal
 * drags translate the track and preview the target tab live; vertical drags are
 * ignored so each page scrolls its own content normally (touch-action: pan-y).
 *
 * Gesture logic is validated via e2e / real-browser QA (jsdom has no layout).
 */
export default function TodayPager({
  index,
  onIndexChange,
  children,
}: TodayPagerProps) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const axisRef = useRef<null | 'x' | 'y'>(null);
  const startRef = useRef({ x: 0, y: 0, base: 0 });
  const indexRef = useRef(index);
  const count = children.length;

  const width = () => bodyRef.current?.clientWidth ?? 0;

  const setX = (px: number, animate: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animate ? SLIDE_TRANSITION : 'none';
    track.style.transform = `translateX(${px}px)`;
  };

  // Reflect the controlled index → track position. Skip while the user is
  // dragging (the pointer handlers own the transform then).
  useEffect(() => {
    indexRef.current = index;
    if (draggingRef.current) return;
    setX(-index * width(), true);
  }, [index]);

  // Initial placement (no animation) + keep aligned on resize.
  useEffect(() => {
    setX(-indexRef.current * width(), false);
    const onResize = () => setX(-indexRef.current * width(), false);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Pointer drag: window-level move/up so a drag that leaves the element still
  // tracks. passive:false so we can preventDefault horizontal moves.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - startRef.current.x;
      const dy = e.clientY - startRef.current.y;
      if (axisRef.current === null) {
        if (Math.abs(dx) < AXIS_DEADZONE && Math.abs(dy) < AXIS_DEADZONE) return;
        axisRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (axisRef.current !== 'x') return;
      e.preventDefault();
      const w = width();
      if (w === 0) return;
      const min = -(count - 1) * w - OVERSCROLL;
      const max = OVERSCROLL;
      const x = Math.max(min, Math.min(max, startRef.current.base + dx));
      setX(x, false);
      const preview = Math.max(0, Math.min(count - 1, Math.round(-x / w)));
      if (preview !== indexRef.current) {
        indexRef.current = preview;
        onIndexChange(preview);
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      if (axisRef.current !== 'x') return;
      const w = width();
      if (w === 0) return;
      const dx = e.clientX - startRef.current.x;
      const target = Math.max(
        0,
        Math.min(count - 1, Math.round(-(startRef.current.base + dx) / w)),
      );
      indexRef.current = target;
      setX(-target * w, true);
      onIndexChange(target);
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [count, onIndexChange]);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    axisRef.current = null;
    startRef.current = {
      x: e.clientX,
      y: e.clientY,
      base: -indexRef.current * width(),
    };
    const track = trackRef.current;
    if (track) track.style.transition = 'none';
  };

  return (
    <div ref={bodyRef} className="flex-1 min-h-0 relative overflow-hidden">
      <div
        ref={trackRef}
        className="flex h-full"
        style={{ touchAction: 'pan-y', willChange: 'transform' }}
        onPointerDown={onPointerDown}
        onDragStart={(e) => e.preventDefault()}
      >
        {children.map((child, i) => (
          <div
            key={i}
            className="basis-full shrink-0 grow-0 h-full overflow-y-auto"
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
