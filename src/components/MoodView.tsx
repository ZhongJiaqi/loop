import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus } from 'lucide-react';
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
    <div>
      <div className="mb-10 pt-4">
        <p className="text-xs text-[#8C8C8C] leading-relaxed font-light tracking-wide italic">
          See your feelings.
        </p>
      </div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mb-8 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#A09E9A] hover:text-[#2C2C2C] transition-colors"
      >
        <Plus className="w-3 h-3 stroke-[2]" />
        <span>See Feelings</span>
      </motion.button>

      {groups.length === 0 ? (
        <p className="text-xs text-[#A09E9A] mt-12 italic">
          Nothing here yet.
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
                <MoodEntryRow
                  entry={e}
                  onEdit={handleEdit}
                  onDelete={
                    store.deleteMood
                      ? (entry) => {
                          void store.deleteMood!(entry.id);
                        }
                      : undefined
                  }
                />
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
