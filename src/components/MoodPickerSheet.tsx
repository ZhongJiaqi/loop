import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  if (typeof document === 'undefined') return null; // SSR 兜底
  const activeBucket = bucket ? MOOD_BUCKETS.find((b) => b.id === bucket)! : null;

  // Portal 出去：父链 motion.div 用了 filter prop 会创建新 containing block，
  // 让 fixed inset-0 不再 anchor 到 viewport。Portal 到 body 跳出影响。
  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-[#F9F8F6]/75 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="看见此刻的感受"
    >
      <div
        className="absolute inset-x-0 bottom-0 bg-[#F9F8F6] rounded-t-3xl p-4 pb-6 max-w-md mx-auto max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-9 h-1 rounded-full bg-[#D8D5CD] mx-auto mb-3" />

        <p className="text-xs text-[#8C8C8C] leading-relaxed font-light tracking-wide italic text-center mb-4">
          Notice what's here.
        </p>

        {/* Step 1: 列表式 9 桶 — 跟 loop 编辑/极简调性一致 */}
        <div className="border-t border-[#EDEAE3] mb-3">
          {MOOD_BUCKETS.map((b) => {
            const isActive = bucket === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setBucket(b.id)}
                className={`w-full flex items-center gap-3 py-3 px-1 border-b border-[#EDEAE3] text-left transition-colors ${
                  isActive ? 'bg-[#F4F2EC]' : 'hover:bg-[#FAF7F0]'
                }`}
                aria-pressed={isActive}
                aria-label={`看见 ${b.zhName}`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: b.color }}
                />
                <span
                  className={`flex-1 text-base text-[#2C2C2C] ${isActive ? 'font-medium' : ''}`}
                  style={{ fontFamily: 'ui-serif, Georgia, "Songti SC", "宋体", serif' }}
                >
                  {b.zhName}
                </span>
                {b.motive !== '—' && (
                  <span className="text-[10px] text-[#A09E9A] italic">{b.motive}</span>
                )}
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
                  className="text-[11px] uppercase tracking-[0.2em] text-[#A09E9A] hover:text-[#2C2C2C] transition-colors"
                >
                  Done
                </button>
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1.5 max-h-[40vh] overflow-y-auto pb-2">
                {activeBucket.words.map((w) => {
                  const on = words.includes(w);
                  return (
                    <button
                      key={w}
                      onClick={() => toggleWord(w)}
                      className={`text-xs px-0.5 py-1 transition-colors ${
                        on ? 'text-[#2C2C2C] font-medium' : 'text-[#8C8C8C] hover:text-[#2C2C2C]'
                      }`}
                      style={{
                        fontFamily: 'ui-serif, Georgia, "Songti SC", "宋体", serif',
                        borderBottom: on
                          ? `1.5px solid ${activeBucket.color}`
                          : '1.5px solid transparent',
                      }}
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
    </div>,
    document.body,
  );
}
