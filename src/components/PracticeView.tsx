import { useState, useRef, FormEvent, useMemo } from 'react';
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
import SwipeActions from './SwipeActions';
import SortableHabitItem from './SortableHabitItem';

type Category = 'habit' | 'affirmation' | 'mindset';

interface PracticeViewProps {
  store: any;
}

interface CategorySectionProps {
  title: string;
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

function CategorySection({
  title,
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
    <div className="mb-10">
      <div className="text-[10px] font-medium text-[#A09E9A] uppercase tracking-[0.2em] mb-4">
        {title}
      </div>

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

  return (
    <div className="pb-12">
      <div className="mb-10 pt-4">
        <p className="text-xs text-[#8C8C8C] leading-relaxed font-light tracking-wide italic">
          Decide what to repeat.
        </p>
      </div>

      <CategorySection
        title="Affirmations"
        category="affirmation"
        emptyText="Words you live by, repeated."
        habits={affirmations}
        store={store}
      />

      <CategorySection
        title="Mindsets"
        category="mindset"
        emptyText="Mental models you return to."
        habits={mindsets}
        store={store}
      />

      <CategorySection
        title="Habits"
        category="habit"
        emptyText="The beginning of a new chapter."
        habits={habits}
        store={store}
      />
    </div>
  );
}
