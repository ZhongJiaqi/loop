import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MOOD_BUCKETS } from '../lib/moods';
import type { MoodBucketId } from '../types';

interface MoodPickerSheetProps {
  open: boolean;
  initialBucket?: MoodBucketId;
  initialWords?: string[];
  onClose: () => void;
  onDone: (bucket: MoodBucketId, words: string[]) => void;
}

export default function MoodPickerSheet({
  open,
  initialBucket,
  initialWords,
  onClose,
  onDone,
}: MoodPickerSheetProps) {
  const [bucket, setBucket] = useState<MoodBucketId | null>(initialBucket ?? null);
  const [words, setWords] = useState<string[]>(initialWords ?? []);

  // 每次 open 时重置或回填初始值（编辑入口）
  useEffect(() => {
    if (open) {
      setBucket(initialBucket ?? null);
      setWords(initialWords ?? []);
    }
  }, [open, initialBucket, initialWords]);

  const handleClose = () => {
    onClose();
  };

  const handleDone = () => {
    if (!bucket) return;
    onDone(bucket, words);
  };

  const toggleWord = (w: string) => {
    setWords((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));
  };

  if (!open) return null;
  const activeBucket = bucket ? MOOD_BUCKETS.find((b) => b.id === bucket)! : null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/30"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="选择此刻的情绪"
    >
      <div
        className="absolute inset-x-0 bottom-0 bg-[#F9F8F6] rounded-t-3xl p-4 pb-6 max-w-md mx-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full bg-[#D8D5CD] mx-auto mb-3" />

        <div className="text-[11px] uppercase tracking-[0.2em] text-[#8C8C8C] text-center mb-1">
          MOOD
        </div>
        <div className="text-sm text-[#2C2C2C] text-center mb-4">此刻你怎么样？</div>

        {/* Step 1: 3×3 网格 */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {MOOD_BUCKETS.map((b) => {
            const isActive = bucket === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setBucket(b.id)}
                className={`aspect-square rounded-xl p-2 flex flex-col justify-between border transition-colors ${
                  isActive ? 'border-[#2C2C2C] bg-white' : 'border-[#EDEAE3] bg-white opacity-90'
                }`}
                aria-pressed={isActive}
                aria-label={`选择 ${b.zhName}`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: b.color }}
                />
                <span className="text-[12px] text-[#2C2C2C] font-medium text-left leading-tight">
                  {b.zhName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step 2: 词云（仅在选了桶之后展开） */}
        <AnimatePresence>
          {activeBucket && (
            <motion.div
              key="words"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="flex items-center justify-between mt-2 mb-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#2C2C2C]">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: activeBucket.color }}
                  />
                  {activeBucket.zhName}
                </div>
                <button
                  onClick={handleDone}
                  className="text-xs font-medium text-[#2C2C2C] bg-[#F0EEE8] px-3 py-1.5 rounded-full"
                >
                  完成
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-[40vh] overflow-y-auto">
                {activeBucket.words.map((w) => {
                  const on = words.includes(w);
                  return (
                    <button
                      key={w}
                      onClick={() => toggleWord(w)}
                      className={`text-[11px] px-2.5 py-1 rounded-full transition-colors ${
                        on ? 'text-white' : 'bg-[#F4F2EC] text-[#2C2C2C]'
                      }`}
                      style={on ? { background: activeBucket.color } : undefined}
                      aria-pressed={on}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
