import type { CSSProperties, ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableHabitItemProps {
  id: string;
  index: number;
  /**
   * The row body — typically <SwipeActions>...<row content>...</SwipeActions>.
   * Receives no props; the parent owns its content.
   */
  children: ReactNode;
}

/**
 * Wraps a Practice-page row so it can be reordered via drag-and-drop.
 *
 * The activator is the left-side ordinal label (e.g. "01"). Pressing or
 * touching that small element initiates the drag; the rest of the row is
 * untouched so the existing SwipeActions left-swipe edit/delete still works.
 *
 * Keyboard a11y is provided by @dnd-kit's keyboard sensor on the activator:
 * Tab to focus the ordinal → Space to lift → ↑/↓ to move → Space to drop.
 */
export default function SortableHabitItem({ id, index, children }: SortableHabitItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    // Lift the dragged row slightly above siblings without affecting layout flow.
    zIndex: isDragging ? 10 : undefined,
    opacity: isDragging ? 0.85 : 1,
    background: isDragging ? '#F5F2EC' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="flex items-stretch">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          type="button"
          aria-label={`Reorder item ${index + 1}. Press space or enter to lift, arrow keys to move, space again to drop.`}
          className="flex items-center justify-center w-8 shrink-0 text-[10px] font-medium text-[#C4C1B9] tracking-widest cursor-grab active:cursor-grabbing touch-none select-none [-webkit-touch-callout:none] [-webkit-user-select:none] focus:outline-none focus:text-[#8C8C8C] hover:text-[#8C8C8C] transition-colors"
        >
          {(index + 1).toString().padStart(2, '0')}
        </button>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
