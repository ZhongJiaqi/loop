import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isYesterday, differenceInDays, parseISO } from 'date-fns';
import { motion, AnimatePresence, PanInfo, useDragControls } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Task, MicroHabit } from '../types';
import { cn } from '../lib/utils';

type Filter = 'all' | 'habit' | 'affirmation';

export default function HistoryView({ store }: { store: any }) {
  const { tasks, microHabits } = store.data;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [sheetOpen, setSheetOpen] = useState(false);

  // build category map (habitId → category)
  const habitCategoryMap = new Map<string, 'habit' | 'affirmation'>();
  microHabits.forEach((h: MicroHabit) =>
    habitCategoryMap.set(h.id, h.category ?? 'habit')
  );

  // apply filter to tasks
  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter((t: Task) => habitCategoryMap.get(t.habitId) === filter);

  // Calculate stats — Active Practices, filter-aware
  const activeFilteredHabits = filter === 'all'
    ? microHabits.filter((h: MicroHabit) => h.active)
    : microHabits.filter((h: MicroHabit) => h.active && (h.category ?? 'habit') === filter);
  const activePracticesCount = activeFilteredHabits.length;

  // Calculate Best Streak
  const tasksByDate = filteredTasks.reduce((acc: any, task: Task) => {
    if (!acc[task.date]) acc[task.date] = { total: 0, completed: 0 };
    acc[task.date].total++;
    if (task.completed) acc[task.date].completed++;
    return acc;
  }, {});

  const perfectDates = Object.keys(tasksByDate)
    .filter(date => tasksByDate[date].total > 0 && tasksByDate[date].completed === tasksByDate[date].total)
    .sort();

  let bestStreak = 0;
  let currentStreak = 0;
  let previousDate: Date | null = null;

  for (const dateStr of perfectDates) {
    const dateObj = parseISO(dateStr);
    if (!previousDate) {
      currentStreak = 1;
    } else {
      const diffDays = differenceInDays(dateObj, previousDate);
      if (diffDays === 1) {
        currentStreak++;
      } else {
        currentStreak = 1;
      }
    }
    if (currentStreak > bestStreak) {
      bestStreak = currentStreak;
    }
    previousDate = dateObj;
  }

  // Calculate Weekly Data
  const today = new Date();
  const weekStartThisWeek = startOfWeek(today);
  const weekEndThisWeek = endOfWeek(today);
  const thisWeekDays = eachDayOfInterval({ start: weekStartThisWeek, end: weekEndThisWeek });

  const weeklyData = thisWeekDays.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayTasks = filteredTasks.filter((t: Task) => t.date === dateStr);
    const total = dayTasks.length;
    const completed = dayTasks.filter((t: Task) => t.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      dayLabel: format(day, 'EEE'),
      percentage,
      total,
      completed
    };
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="pb-12 pt-4">
      {/* Calendar View */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] font-medium text-[#A09E9A] uppercase tracking-[0.2em]">
            History
          </h2>
          <div className="flex items-center gap-4 text-[10px] tracking-[0.2em] uppercase">
            {(['all', 'habit', 'affirmation'] as Filter[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`transition-colors ${
                  filter === f ? 'text-[#1A1A1A] font-medium' : 'text-[#A09E9A] hover:text-[#5C5A56]'
                }`}
              >
                {f === 'habit' ? 'Habits' : f === 'affirmation' ? 'Affirmations' : 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-4 mb-8">
          <button onClick={prevMonth} className="text-[#A09E9A] hover:text-[#1A1A1A] transition-colors">
            <ChevronLeft className="w-4 h-4 stroke-[1.5]" />
          </button>
          <span className="text-xs font-serif tracking-widest text-[#1A1A1A] uppercase w-24 text-center">
            {format(currentMonth, 'MMM yyyy')}
          </span>
          <button onClick={nextMonth} className="text-[#A09E9A] hover:text-[#1A1A1A] transition-colors">
            <ChevronRight className="w-4 h-4 stroke-[1.5]" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-y-4 mb-4">
          {weekDays.map(day => (
            <div key={day} className="text-center text-[9px] font-medium text-[#C4C1B9] uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-y-4">
          {calendarDays.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTasks = filteredTasks.filter((t: Task) => t.date === dateStr);
            const totalCount = dayTasks.length;
            const completedCount = dayTasks.filter((t: Task) => t.completed).length;
            const allDone = totalCount > 0 && completedCount === totalCount;
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isTodayDate = isToday(day);
            const isSelected = dateStr === selectedDate;

            return (
              <button
                type="button"
                key={dateStr}
                onClick={() => {
                  if (totalCount === 0) return;
                  setSelectedDate(dateStr);
                  setSheetOpen(true);
                }}
                disabled={totalCount === 0}
                aria-label={
                  totalCount === 0
                    ? `${format(day, 'MMM d')} — no practices`
                    : `View ${format(day, 'MMM d')} details`
                }
                aria-pressed={isSelected && sheetOpen}
                className={cn(
                  "flex flex-col items-center justify-center h-10",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1A1A1A] focus-visible:rounded",
                  totalCount === 0 && "cursor-default"
                )}
              >
                <div className={cn(
                  "w-7 h-7 flex items-center justify-center rounded-full text-xs font-serif transition-all duration-300",
                  !isCurrentMonth ? "text-[#EAE8E3]" :
                  allDone ? "bg-[#8A9A86] text-white" :
                  isTodayDate ? "border border-[#8A9A86] text-[#1A1A1A]" :
                  "text-[#2C2C2C] hover:bg-[#F0EFEA]",
                  isSelected && sheetOpen && isCurrentMonth && "ring-2 ring-[#1A1A1A] ring-offset-2 ring-offset-[#F9F8F6]"
                )}>
                  {format(day, 'd')}
                </div>
                {isCurrentMonth && totalCount > 0 && !allDone && (
                  <div className="w-1 h-1 rounded-full bg-[#D1CEC7] mt-1" aria-hidden />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <DayDetailSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        selectedDate={selectedDate}
        tasks={filteredTasks}
        microHabits={microHabits}
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 mb-16">
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-serif font-light text-[#1A1A1A] mb-3">{bestStreak}</span>
          <span className="text-[9px] font-medium text-[#A09E9A] uppercase tracking-[0.2em]">Best<br/>Streak</span>
        </div>
        <div className="flex flex-col items-center justify-center text-center">
          <span className="text-4xl font-serif font-light text-[#1A1A1A] mb-3">{activePracticesCount}</span>
          <span className="text-[9px] font-medium text-[#A09E9A] uppercase tracking-[0.2em]">Active<br/>Practices</span>
        </div>
      </div>

      {/* Weekly Progress */}
      <div className="mb-16">
        <h2 className="text-[10px] font-medium text-[#A09E9A] uppercase tracking-[0.2em] mb-6 text-center">
          This Week's Progress
        </h2>
        <div className="flex items-end justify-between h-32 px-2 gap-2">
          {weeklyData.map(data => (
            <div key={data.dayLabel} className="flex flex-col items-center gap-3 flex-1 h-full">
              <div className="w-full max-w-[28px] flex-1 bg-[#F0EFEA] rounded-t-md relative flex items-end justify-center overflow-hidden">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${data.percentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="w-full bg-[#8A9A86] rounded-t-md"
                />
              </div>
              <span className="text-[9px] font-medium text-[#A09E9A] uppercase tracking-widest">
                {data.dayLabel}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* The 21-Day Hall — view-computed: any microHabit with >= 21 total
          completed days lands here, sorted by completion count descending.
          Filter-aware (respects All / Habits / Affirmations toggle). */}
      <div>
        <h2 className="text-[10px] font-medium text-[#A09E9A] uppercase tracking-[0.2em] mb-6 text-center">
          The 21-Day Hall
        </h2>

        {(() => {
          // For each microHabit (filter-aware) compute completion count + the
          // exact date the 21st completion landed (= achievedDate).
          const hallEntries = microHabits
            .filter((h: MicroHabit) => {
              if (filter !== 'all' && (h.category ?? 'habit') !== filter) return false;
              const completedCount = tasks.filter(
                (t: Task) => t.habitId === h.id && t.completed,
              ).length;
              return completedCount >= 21;
            })
            .map((h: MicroHabit) => {
              const completedSorted = tasks
                .filter((t: Task) => t.habitId === h.id && t.completed)
                .sort((a: Task, b: Task) => a.date.localeCompare(b.date));
              return {
                id: h.id,
                title: h.title,
                category: h.category ?? 'habit',
                count: completedSorted.length,
                achievedDate: completedSorted[20].date, // the 21st completion's date
              };
            })
            .sort(
              (a: { count: number }, b: { count: number }) => b.count - a.count,
            );

          if (hallEntries.length === 0) {
            return (
              <div className="text-center py-8">
                <p className="font-serif italic text-sm text-[#B0ADA5]">
                  Consistency builds character.
                </p>
              </div>
            );
          }

          return (
            <div className="space-y-4">
              {hallEntries.map(
                (entry: {
                  id: string;
                  title: string;
                  category: 'habit' | 'affirmation';
                  count: number;
                  achievedDate: string;
                }) => {
                  const isAffirmation = entry.category === 'affirmation';
                  return (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      key={entry.id}
                      className="flex items-center justify-between py-4 border-b border-[#EAE8E3]"
                    >
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <span
                          className={`text-[15px] font-serif text-[#2C2C2C] truncate ${
                            isAffirmation ? 'italic' : ''
                          }`}
                        >
                          {isAffirmation && (
                            <span className="text-[#A09E9A]">&ldquo;</span>
                          )}
                          {entry.title}
                          {isAffirmation && (
                            <span className="text-[#A09E9A]">&rdquo;</span>
                          )}
                        </span>
                        <span className="text-[10px] text-[#A09E9A] tracking-widest uppercase">
                          {entry.count} Times Completed
                        </span>
                      </div>
                      <span className="text-[10px] text-[#A09E9A] tracking-widest uppercase text-right ml-4 whitespace-nowrap">
                        Achieved<br/>{entry.achievedDate}
                      </span>
                    </motion.div>
                  );
                },
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}

function renderTaskRow(task: Task, isAffirmation: boolean) {
  const dotClass = task.completed
    ? isAffirmation
      ? 'bg-[#C9A961]'
      : 'bg-[#8A9A86]'
    : 'border border-[#D1CEC7] bg-transparent';
  return (
    <li key={task.id} className="flex items-center gap-3 py-1">
      <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', dotClass)} aria-hidden />
      <span
        className={cn(
          'text-[15px] font-serif truncate',
          task.completed ? 'text-[#2C2C2C]' : 'text-[#B0ADA5]',
          isAffirmation && 'italic'
        )}
      >
        {isAffirmation && <span className="text-[#A09E9A]">&ldquo;</span>}
        {task.title}
        {isAffirmation && <span className="text-[#A09E9A]">&rdquo;</span>}
      </span>
    </li>
  );
}

interface DayDetailSheetProps {
  open: boolean;
  onClose: () => void;
  selectedDate: string;
  tasks: Task[];
  microHabits: MicroHabit[];
}

const SHEET_HEADING_ID = 'day-detail-sheet-heading';
const SHEET_CLOSE_DRAG_THRESHOLD = 100;

function DayDetailSheet({ open, onClose, selectedDate, tasks, microHabits }: DayDetailSheetProps) {
  const dragControls = useDragControls();
  const dayDate = parseISO(selectedDate);
  const habitCategoryMap = new Map<string, 'habit' | 'affirmation'>();
  const habitById = new Map<string, MicroHabit>();
  microHabits.forEach((h) => {
    habitCategoryMap.set(h.id, h.category ?? 'habit');
    habitById.set(h.id, h);
  });
  const dayTasks = tasks.filter((t) => t.date === selectedDate);
  // Group by category (affirmations first, habits second) to match the
  // Today tab's vertical layout. Within each group, completed tasks bubble
  // up before missed ones; same-state tasks follow the user's Practice-page
  // sort order so this view matches Today.
  const isAff = (t: Task) => habitCategoryMap.get(t.habitId) === 'affirmation';
  const byHabitOrder = (a: Task, b: Task) => {
    const ha = habitById.get(a.habitId);
    const hb = habitById.get(b.habitId);
    const ai = ha?.sortIndex;
    const bi = hb?.sortIndex;
    if (typeof ai === 'number' && typeof bi === 'number') return ai - bi;
    if (typeof ai === 'number') return -1;
    if (typeof bi === 'number') return 1;
    return (ha?.createdAt ?? '').localeCompare(hb?.createdAt ?? '');
  };
  const affs = dayTasks.filter(isAff);
  const habs = dayTasks.filter((t) => !isAff(t));
  const orderedTasks = [
    ...affs.filter((t) => t.completed).sort(byHabitOrder),
    ...affs.filter((t) => !t.completed).sort(byHabitOrder),
    ...habs.filter((t) => t.completed).sort(byHabitOrder),
    ...habs.filter((t) => !t.completed).sort(byHabitOrder),
  ];
  const completedCount = dayTasks.filter((t) => t.completed).length;

  const dateHeading = isToday(dayDate)
    ? `${format(dayDate, 'MMM d')} · Today`
    : isYesterday(dayDate)
    ? `${format(dayDate, 'MMM d')} · Yesterday`
    : format(dayDate, 'MMM d, yyyy');

  // Escape key closes the sheet
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll while sheet is open (prevents background drift on mobile)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > SHEET_CLOSE_DRAG_THRESHOLD) onClose();
  };

  // Render via portal to document.body so fixed positioning anchors to the
  // viewport, not to the ancestor <motion.div> in App.tsx (which uses
  // transform/filter and therefore becomes the containing block for fixed
  // descendants — making the sheet appear at the bottom of History content
  // instead of the bottom of the screen).
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/30 z-40"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={SHEET_HEADING_ID}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#F9F8F6] rounded-t-2xl max-h-[80vh] mx-auto max-w-md flex flex-col"
          >
            <div
              className="pt-6 px-6 pb-2 cursor-grab active:cursor-grabbing touch-none select-none"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <div className="w-12 h-1 bg-[#E5E3DD] rounded-full mx-auto mb-5" aria-hidden />
              <h2
                id={SHEET_HEADING_ID}
                className="text-[10px] font-medium text-[#A09E9A] uppercase tracking-[0.2em] mb-2 text-center"
              >
                {dateHeading}
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 pt-2">
              {orderedTasks.length === 0 ? (
                <p className="text-center font-serif italic text-sm text-[#B0ADA5] py-4">
                  No practices on this day.
                </p>
              ) : (
                <>
                  <p className="text-center text-[11px] tracking-widest uppercase text-[#A09E9A] mb-5">
                    {completedCount} of {orderedTasks.length} completed
                  </p>
                  <ul className="space-y-3 pb-4">
                    {orderedTasks.map((task) =>
                      renderTaskRow(task, habitCategoryMap.get(task.habitId) === 'affirmation')
                    )}
                  </ul>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
