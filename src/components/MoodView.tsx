import { useState } from 'react';
import MoodPickerSheet from './MoodPickerSheet';
import MoodEntryRow from './MoodEntryRow';
import { groupEntriesByDay, formatDayLabel } from '../lib/moodFormat';
import type { MoodBucketId, MoodEntry } from '../types';

interface MoodViewProps {
  store: {
    entries: MoodEntry[];
    loaded: boolean;
    addMood: (bucket: MoodBucketId, words: string[]) => Promise<void> | void;
    updateMood?: (
      id: string,
      patch: Partial<Pick<MoodEntry, 'bucket' | 'words'>>,
    ) => Promise<void> | void;
    deleteMood?: (id: string) => Promise<void> | void;
  };
}

export default function MoodView({ store }: MoodViewProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<MoodEntry | null>(null);

  const groups = groupEntriesByDay(store.entries);
  const today = new Date();

  const handleDone = async (bucket: MoodBucketId, words: string[]) => {
    if (editing && store.updateMood) {
      await store.updateMood(editing.id, { bucket, words });
    } else {
      await store.addMood(bucket, words);
    }
    setPickerOpen(false);
    setEditing(null);
  };

  const handleEdit = (entry: MoodEntry) => {
    setEditing(entry);
    setPickerOpen(true);
  };

  return (
    <div className="pt-2">
      <p className="text-[11px] tracking-[0.18em] uppercase text-[#B0AEA9] text-center mb-4">
        这些天你的样子
      </p>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="w-full py-2.5 mb-5 border border-dashed border-[#C9C6BE] rounded-xl text-sm text-[#6B6864] bg-white"
      >
        + 此刻你怎么样？
      </button>

      {groups.length === 0 ? (
        <p className="text-center text-xs text-[#B0AEA9] mt-12">
          还没有记录。点上面那行命名一下你现在的状态。
        </p>
      ) : (
        groups.map((g) => (
          <section key={g.date} className="mb-4">
            <header className="flex items-baseline justify-between border-b border-[#EDEAE3] pb-1 mb-2">
              <h3 className="text-[13px] font-semibold text-[#2C2C2C]">
                {formatDayLabel(g.date, today)}
              </h3>
              <span className="text-[10px] text-[#B0AEA9]">{g.entries.length} 次</span>
            </header>
            {g.entries.map((e) => (
              <div key={e.id}>
                <MoodEntryRow entry={e} onEdit={handleEdit} />
              </div>
            ))}
          </section>
        ))
      )}

      <MoodPickerSheet
        open={pickerOpen}
        initialBucket={editing?.bucket}
        initialWords={editing?.words}
        onClose={() => {
          setPickerOpen(false);
          setEditing(null);
        }}
        onDone={handleDone}
      />
    </div>
  );
}
