import { useState, useRef, useCallback, useEffect, FormEvent, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { MicroHabit } from '../types';
import { sortByOrder } from '../lib/reorder';
import { TODAY_TABS, type TodayTabKey } from '../lib/todayTabs';
import { readLastTab, writeLastTab, PRACTICE_TAB_STORAGE_KEY } from '../lib/lastTab';
import { useFillHeight } from '../lib/fillHeight';
import ModuleTabBar, { type ModuleTab } from './ModuleTabBar';
import SwipeActions from './SwipeActions';
import SortableHabitItem from './SortableHabitItem';

type Category = TodayTabKey;

interface PracticeViewProps {
  store: any;
}

interface CategorySectionProps {
  category: Category;
  emptyText: string;
  habits: MicroHabit[];
  store: any;
}

const CATEGORY_PLACEHOLDER: Record<Category, string> = {
  affirmation: 'I am…',
  mindset: 'Enter a mindset…',
  habit: 'Enter a new habit…',
};

const CATEGORY_ADD_LABEL: Record<Category, string> = {
  affirmation: 'Add Affirmation',
  mindset: 'Add Mindset',
  habit: 'Add Habit',
};

const CATEGORY_EMPTY_TEXT: Record<Category, string> = {
  affirmation: 'Words you live by, repeated.',
  mindset: 'Mental models you return to.',
  habit: 'The beginning of a new chapter.',
};

function CategorySection({
  category,
  emptyText,
  habits,
  store,
}: CategorySectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const submittedRef = useRef(false);

  // Sensors: touch needs a small delay so vertical scroll still works;
  // pointer needs a tiny distance threshold so plain taps don't initiate drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (submittedRef.current) return;
    if (!newTitle.trim()) return;
    submittedRef.current = true;
    const t = newTitle.trim();
    setNewTitle('');
    setIsAdding(false);
    store.addMicroHabit(t, category);
  };

  const handleSaveEdit = (id: string) => {
    if (editTitle.trim()) {
      store.updateMicroHabit(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = habits.findIndex(h => h.id === active.id);
    const newIndex = habits.findIndex(h => h.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(habits, oldIndex, newIndex);
    store.reorderMicroHabits(next.map(h => h.id));
  };

  const isAffirmation = category === 'affirmation';
  const sortableIds = habits.map(h => h.id);

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          <AnimatePresence mode="popLayout">
            {habits.length === 0 && !isAdding ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-6 text-center"
              >
                <p className="text-sm font-serif italic text-[#B0ADA5]">{emptyText}</p>
              </motion.div>
            ) : (
              habits.map((habit, index) => (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, filter: 'blur(4px)' }}
                  transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                  key={habit.id}
                >
                  <SortableHabitItem id={habit.id} index={index}>
                    <SwipeActions
                      onEdit={() => {
                        setEditingId(habit.id);
                        setEditTitle(habit.title);
                      }}
                      onDelete={() => store.deleteMicroHabit(habit.id)}
                    >
                      <div className="flex items-center py-4 border-b border-[#EAE8E3] select-none [-webkit-touch-callout:none] [-webkit-user-select:none]">
                        {editingId === habit.id ? (
                          <input
                            autoFocus
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onBlur={() => handleSaveEdit(habit.id)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveEdit(habit.id)}
                            className="flex-1 bg-transparent text-[15px] font-serif border-b border-[#8A9A86] focus:outline-none text-[#2C2C2C] py-0.5 select-text [-webkit-user-select:text] [-webkit-touch-callout:default]"
                          />
                        ) : (
                          <span
                            className={`text-[15px] font-serif text-[#2C2C2C] truncate ${
                              isAffirmation ? 'italic' : ''
                            }`}
                          >
                            {isAffirmation && <span className="text-[#A09E9A]">&ldquo;</span>}
                            {habit.title}
                            {isAffirmation && <span className="text-[#A09E9A]">&rdquo;</span>}
                          </span>
                        )}
                      </div>
                    </SwipeActions>
                  </SortableHabitItem>
                </motion.div>
              ))
            )}

            {isAdding && (
              <motion.form
                key="adding"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleAdd}
                className="flex items-center gap-4 py-4 border-b border-[#2C2C2C]"
              >
                <span className="text-[10px] font-medium text-[#C4C1B9] w-8 tracking-widest text-center">
                  {(habits.length + 1).toString().padStart(2, '0')}
                </span>
                <input
                  autoFocus
                  type="text"
                  placeholder={CATEGORY_PLACEHOLDER[category]}
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onBlur={() => {
                    if (submittedRef.current) return;
                    if (newTitle.trim()) {
                      submittedRef.current = true;
                      const t = newTitle.trim();
                      setNewTitle('');
                      setIsAdding(false);
                      store.addMicroHabit(t, category);
                    } else {
                      setIsAdding(false);
                    }
                  }}
                  className={`flex-1 bg-transparent text-[15px] font-serif placeholder:text-[#C4C1B9] placeholder:italic focus:outline-none ${
                    isAffirmation ? 'italic' : ''
                  }`}
                />
              </motion.form>
            )}
          </AnimatePresence>
        </SortableContext>
      </DndContext>

      {!isAdding && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => {
            submittedRef.current = false;
            setIsAdding(true);
          }}
          className="mt-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#A09E9A] hover:text-[#2C2C2C] transition-colors"
        >
          <Plus className="w-3 h-3 stroke-[2]" />
          <span>{CATEGORY_ADD_LABEL[category]}</span>
        </motion.button>
      )}
    </div>
  );
}

export default function PracticeView({ store }: PracticeViewProps) {
  const allHabits: MicroHabit[] = store.data.microHabits;
  const affirmations = useMemo(
    () => sortByOrder(allHabits.filter(h => (h.category ?? 'habit') === 'affirmation')),
    [allHabits],
  );
  const mindsets = useMemo(
    () => sortByOrder(allHabits.filter(h => h.category === 'mindset')),
    [allHabits],
  );
  const habits = useMemo(
    () => sortByOrder(allHabits.filter(h => (h.category ?? 'habit') === 'habit')),
    [allHabits],
  );
  const habitsByKey: Record<Category, MicroHabit[]> = {
    affirmation: affirmations,
    mindset: mindsets,
    habit: habits,
  };

  // ── Sub-tab state ────────────────────────────────────────────────────────
  // One module's definitions at a time; tap a tab to switch. Remembered under a
  // key independent from Today's (`loop.practice.tab`).
  const [tabIndex, setTabIndex] = useState<number>(() => {
    const i = TODAY_TABS.findIndex((t) => t.key === readLastTab(PRACTICE_TAB_STORAGE_KEY));
    return i === -1 ? 0 : i;
  });
  const handleSelect = useCallback((i: number) => {
    setTabIndex(i);
    const key = TODAY_TABS[i]?.key;
    if (key) writeLastTab(key, PRACTICE_TAB_STORAGE_KEY);
  }, []);

  // Tabs: label + item count; underline is a full selection bar (Practice has no
  // daily-completion progress, unlike Today).
  const tabs: ModuleTab[] = TODAY_TABS.map((meta) => {
    const count = habitsByKey[meta.key].length;
    return {
      key: meta.key,
      label: meta.label,
      sub: meta.sub,
      color: meta.color,
      badge: String(count),
      fillPct: 100,
      ariaLabel: `${meta.name}, ${count} ${count === 1 ? 'item' : 'items'}`,
    };
  });

  // Bounded height + internal scroll (see useFillHeight) so the tab bar stays
  // fixed while the list scrolls, matching Today.
  const rootRef = useRef<HTMLDivElement>(null);
  const fillHeight = useFillHeight(rootRef);

  // Reset the list's scroll position to the top when switching modules.
  const contentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [tabIndex]);

  const activeCategory = TODAY_TABS[tabIndex].key;

  return (
    <div
      ref={rootRef}
      className="flex flex-col pt-4"
      style={{ height: fillHeight ?? undefined }}
    >
      <p className="text-xs text-[#8C8C8C] font-light tracking-wide italic mb-5 flex-shrink-0">
        Decide what to repeat.
      </p>

      <ModuleTabBar tabs={tabs} activeIndex={tabIndex} onSelect={handleSelect} />

      <div ref={contentRef} className="flex-1 min-h-0 overflow-y-auto pt-2 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
          >
            <CategorySection
              category={activeCategory}
              emptyText={CATEGORY_EMPTY_TEXT[activeCategory]}
              habits={habitsByKey[activeCategory]}
              store={store}
            />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
