import SwipeActions from './SwipeActions';
import { bucketById } from '../lib/moods';
import { formatEntryTime } from '../lib/moodFormat';
import type { MoodEntry } from '../types';

interface MoodEntryRowProps {
  entry: MoodEntry;
  onEdit?: (entry: MoodEntry) => void;
  onDelete?: (entry: MoodEntry) => void;
}

export default function MoodEntryRow({ entry, onEdit, onDelete }: MoodEntryRowProps) {
  const b = bucketById(entry.bucket);
  return (
    <SwipeActions
      onEdit={onEdit ? () => onEdit(entry) : undefined}
      onDelete={onDelete ? () => onDelete(entry) : undefined}
      showEdit={!!onEdit}
    >
      <button
        type="button"
        onClick={() => onEdit?.(entry)}
        className="w-full flex items-center gap-2 py-1.5 px-2 text-left bg-[#F9F8F6]"
        aria-label={`${b.zhName} 记录，${formatEntryTime(entry.createdAt)}`}
      >
        <span className="text-[10px] text-[#B0AEA9] w-10 shrink-0">
          {formatEntryTime(entry.createdAt)}
        </span>
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: b.color }}
        />
        <span className="text-xs text-[#2C2C2C] font-medium min-w-[52px] shrink-0">
          {b.zhName}
        </span>
        <span className="text-[11px] text-[#8C8C8C] truncate">
          {entry.words.join(' · ')}
        </span>
      </button>
    </SwipeActions>
  );
}
