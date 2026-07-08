import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  type RefObject,
} from "react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "motion/react";
import type { Options as ConfettiOptions } from "canvas-confetti";
import { Task, MicroHabit, MicroHabitCategory } from "../types";
import { excludeOrphanTasks } from "../lib/orphanTasks";
import { TODAY_TABS, moduleStats, type TodayTabKey } from "../lib/todayTabs";
import { readLastTab, writeLastTab } from "../lib/lastTab";
import { computeFillHeight } from "../lib/fillHeight";
import TodayTabBar, { type TodayTab } from "./TodayTabBar";
import TodayPager from "./TodayPager";

// canvas-confetti dynamic-imported on first celebration so the package
// (~10kB raw / ~4kB gzip) stays out of the initial bundle. The promise is
// module-scoped so subsequent firings reuse the already-loaded module.
let confettiPromise: Promise<(opts: ConfettiOptions) => unknown> | null = null;
function fireConfetti(opts: ConfettiOptions): void {
  if (!confettiPromise) {
    confettiPromise = import("canvas-confetti").then((m) => m.default);
  }
  confettiPromise.then((fire) => fire(opts));
}

interface TodayViewProps {
  store: any;
}

/**
 * Fires a region-scoped confetti burst on the false→true rising edge of
 * `active`, originating from the center of the element pointed to by
 * `sectionRef`. Skipped when `skipWhen` is true on that edge — used to
 * defer to the full-page celebration when both happen simultaneously.
 *
 * Why ref-based edge tracking: `skipWhen` is also a dep, and a skipWhen
 * true→false flip while `active` remained true would otherwise spuriously
 * re-fire (e.g. user uncompletes a habit after page-wide all-done; affirmations'
 * skipWhen flips off but its active was still true — should NOT celebrate).
 */
function useSectionConfetti({
  active,
  sectionRef,
  skipWhen,
  colors,
}: {
  active: boolean;
  sectionRef: RefObject<HTMLElement | null>;
  skipWhen: boolean;
  colors: string[];
}) {
  const prevActiveRef = useRef(false);
  useEffect(() => {
    const wasActive = prevActiveRef.current;
    prevActiveRef.current = active;
    if (skipWhen) return;
    if (!active || wasActive) return;
    const el = sectionRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;
    fireConfetti({
      particleCount: 26,
      spread: 70,
      origin: { x, y },
      colors,
      disableForReducedMotion: true,
      gravity: 0.9,
      scalar: 0.6,
      startVelocity: 22,
      ticks: 120,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, skipWhen]);
}

/**
 * Count consecutive missed days for a habit, looking backwards from today
 * (exclusive). Stops at: first completed day, habit's createdAt boundary,
 * or 365-day safety cap.
 */
function daysSinceLastCompletion(
  habit: MicroHabit,
  today: string,
  allTasks: Task[],
): number {
  const habitCreatedDate = habit.createdAt.slice(0, 10);
  const todayD = new Date(today);
  let missed = 0;
  for (let i = 1; i < 365; i++) {
    const d = new Date(todayD.getTime() - i * 86400000);
    const ds = format(d, "yyyy-MM-dd");
    if (ds < habitCreatedDate) break;
    const wasCompleted = allTasks.some(
      (t) => t.habitId === habit.id && t.date === ds && t.completed,
    );
    if (wasCompleted) break;
    missed++;
  }
  return missed;
}

interface TaskRowProps {
  task: Task;
  category: MicroHabitCategory;
  missedDays: number;
  onToggle: () => void;
}

function TaskRow({ task, category, missedDays, onToggle }: TaskRowProps) {
  const isAffirmation = category === "affirmation";
  const isMindset = category === "mindset";
  const isHabit = category === "habit";
  const isAffirmationDone = isAffirmation && task.completed;
  const isMindsetDone = isMindset && task.completed;
  const isHabitDone = isHabit && task.completed;

  // Habit completion: line-through + muted gray (任务被勾掉的视觉)
  // Affirmation / Mindset completion: 共享一套"被点亮"动画（行 glow + ✨ bloom
  //   + 文字 textShadow pulse）；末尾持续 ✨ 仅 Affirmation 有。
  //   颜色由 category 决定 —— Affirmation 走金色 (#D4AF37 体系)，
  //   Mindset 走藕荷 (Dusk #B48AA0 体系，rgba 180,138,160)。
  const ceremonyDone = isAffirmationDone || isMindsetDone;
  const ceremony = isMindsetDone
    ? {
        bg: "linear-gradient(90deg, rgba(180,138,160,0.22) 0%, rgba(180,138,160,0.08) 40%, transparent 80%)",
        bloomShadow: "rgba(180,138,160,0.85)",
        sparkleShadow: "rgba(180,138,160,0.7)",
        textPulse: [
          "0 0 0px rgba(180,138,160,0)",
          "0 0 14px rgba(180,138,160,0.75)",
          "0 0 0px rgba(180,138,160,0)",
        ],
      }
    : {
        bg: "linear-gradient(90deg, rgba(212,175,55,0.18) 0%, rgba(212,175,55,0.06) 40%, transparent 80%)",
        bloomShadow: "rgba(212,175,55,0.8)",
        sparkleShadow: "rgba(212,175,55,0.65)",
        textPulse: [
          "0 0 0px rgba(212,175,55,0)",
          "0 0 14px rgba(212,175,55,0.7)",
          "0 0 0px rgba(212,175,55,0)",
        ],
      };

  const titleClass = isHabitDone
    ? "text-[#B0ADA5] line-through decoration-[#C4C1B9]"
    : "text-[#2C2C2C]";

  return (
    <div className="flex items-center gap-4 py-3 border-b border-[#EAE8E3] relative overflow-visible">
      {/* 行背景暖光：被点亮瞬间，一道色光从左到右扫过 */}
      <AnimatePresence>
        {ceremonyDone && (
          <motion.div
            key="row-glow"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{
              duration: 1.2,
              times: [0, 0.3, 1],
              ease: "easeOut",
            }}
            className="absolute inset-0 pointer-events-none"
            style={{
              background: ceremony.bg,
            }}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      <div className="relative flex-shrink-0">
        <button
          onClick={onToggle}
          className={`w-4 h-4 rounded-full border-[1.5px] transition-all relative z-10 ${
            task.completed
              ? isAffirmation
                ? "bg-[#C9A961] border-[#C9A961]"
                : isMindset
                  ? "bg-[#B48AA0] border-[#B48AA0]"
                  : "bg-[#8A9A86] border-[#8A9A86]"
              : "border-[#C4C1B9]"
          }`}
          aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        />
        {/* ✨ bloom：从 checkbox 中心一颗 ✨ 由小到大扩散开 —— 仅 Affirmation。
            Mindset 用雾蓝圆点涟漪扩散（水波纹意象，对应"思想被铭记"语义）。 */}
        <AnimatePresence>
          {isAffirmationDone && (
            <motion.span
              key="bloom"
              initial={{ scale: 0, opacity: 0.95 }}
              animate={{ scale: 3.5, opacity: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inline-block text-[14px] leading-none not-italic pointer-events-none"
              style={{
                left: "50%",
                top: "50%",
                marginLeft: "-7px",
                marginTop: "-8px",
                filter: `drop-shadow(0 0 6px ${ceremony.bloomShadow})`,
                transformOrigin: "center",
              }}
              aria-hidden="true"
            >
              ✨
            </motion.span>
          )}
          {isMindsetDone && (
            <motion.span
              key="ripple"
              initial={{ scale: 0.35, opacity: 0.55 }}
              animate={{ scale: 4.5, opacity: 0 }}
              transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
              className="absolute block rounded-full pointer-events-none"
              style={{
                left: "50%",
                top: "50%",
                width: "16px",
                height: "16px",
                marginLeft: "-8px",
                marginTop: "-8px",
                backgroundColor: "rgba(180,138,160,0.45)",
                transformOrigin: "center",
              }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
      </div>

      <span
        className={`flex-1 min-w-0 text-[15px] font-serif transition-colors relative ${titleClass} ${
          isAffirmation ? "italic" : ""
        }`}
      >
        {isAffirmation && <span className="text-[#A09E9A]">&ldquo;</span>}
        {/* 文字暖辉：被点亮瞬间，标题短暂辉光脉冲（颜色随 category 不同） */}
        {ceremonyDone ? (
          <motion.span
            initial={{ textShadow: ceremony.textPulse[0] }}
            animate={{
              textShadow: ceremony.textPulse,
            }}
            transition={{
              duration: 1.4,
              times: [0, 0.3, 1],
              ease: "easeOut",
            }}
          >
            {task.title}
          </motion.span>
        ) : (
          task.title
        )}
        {isAffirmation && <span className="text-[#A09E9A]">&rdquo;</span>}
        <AnimatePresence>
          {isAffirmationDone && (
            <motion.span
              key="sparkle"
              initial={{ opacity: 0, scale: 0.3, rotate: -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.3 }}
              transition={{
                duration: 0.6,
                ease: [0.34, 1.56, 0.64, 1], // back.out — overshoot
              }}
              className="ml-2 inline-block not-italic"
              style={{
                filter: `drop-shadow(0 0 6px ${ceremony.sparkleShadow})`,
              }}
              aria-hidden="true"
            >
              ✨
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      {/* Quiet-streak nudge — surfaces when a practice has been silent ≥ 3 days
          (excluding today). Tone: warm, not punitive. */}
      {!task.completed && missedDays >= 3 && (
        <span
          className="text-[10px] italic text-[#A09E9A] tracking-wide whitespace-nowrap not-italic"
          aria-label={`${missedDays} days since last completion`}
          title={`${missedDays} days since last completion`}
        >
          {missedDays} days quiet
        </span>
      )}
    </div>
  );
}

export default function TodayView({ store }: TodayViewProps) {
  const today = format(new Date(), "yyyy-MM-dd");
  // 排除孤儿任务（对应习惯已删除的残留旧记录），否则它们会被下方 `?? "habit"`
  // 兜底误显示在 Habits 区（尤其被删掉的旧 mindset 任务）。
  const validTasks = excludeOrphanTasks(store.data.tasks, store.data.microHabits);
  const tasksToday = validTasks.filter((t: Task) => t.date === today);

  const habitCategoryMap = new Map<string, MicroHabitCategory>();
  const habitById = new Map<string, MicroHabit>();
  store.data.microHabits.forEach((h: MicroHabit) => {
    habitCategoryMap.set(h.id, h.category ?? "habit");
    habitById.set(h.id, h);
  });

  const allTasks: Task[] = validTasks;
  const missedDaysByHabitId = new Map<string, number>();
  store.data.microHabits.forEach((h: MicroHabit) => {
    missedDaysByHabitId.set(h.id, daysSinceLastCompletion(h, today, allTasks));
  });
  const getMissed = (habitId: string) => missedDaysByHabitId.get(habitId) ?? 0;

  // Sort today's tasks by the user-chosen habit order (Practice page reorder).
  // Within each section: explicit sortIndex first, then legacy items by createdAt.
  const sortByHabitOrder = (a: Task, b: Task) => {
    const ha = habitById.get(a.habitId);
    const hb = habitById.get(b.habitId);
    const ai = ha?.sortIndex;
    const bi = hb?.sortIndex;
    if (typeof ai === "number" && typeof bi === "number") return ai - bi;
    if (typeof ai === "number") return -1;
    if (typeof bi === "number") return 1;
    return (ha?.createdAt ?? "").localeCompare(hb?.createdAt ?? "");
  };

  const affirmations = tasksToday
    .filter((t: Task) => habitCategoryMap.get(t.habitId) === "affirmation")
    .sort(sortByHabitOrder);
  const mindsets = tasksToday
    .filter((t: Task) => habitCategoryMap.get(t.habitId) === "mindset")
    .sort(sortByHabitOrder);
  const habits = tasksToday
    .filter((t: Task) => habitCategoryMap.get(t.habitId) === "habit")
    .sort(sortByHabitOrder);

  const allCompleted =
    tasksToday.length > 0 && tasksToday.every((t: Task) => t.completed);

  const affAllCompleted =
    affirmations.length > 0 && affirmations.every((t: Task) => t.completed);
  const mindAllCompleted =
    mindsets.length > 0 && mindsets.every((t: Task) => t.completed);
  const habAllCompleted =
    habits.length > 0 && habits.every((t: Task) => t.completed);

  const affSectionRef = useRef<HTMLDivElement>(null);
  const mindSectionRef = useRef<HTMLDivElement>(null);
  const habSectionRef = useRef<HTMLDivElement>(null);

  // Celebrate when the user completes everything for the day.
  // Honors prefers-reduced-motion via `disableForReducedMotion`.
  useEffect(() => {
    if (!allCompleted) return;
    fireConfetti({
      particleCount: 80,
      spread: 100,
      origin: { y: 0.4 },
      colors: ["#D4AF37", "#F3E5AB", "#C5B358", "#E6E6FA"],
      disableForReducedMotion: true,
      gravity: 0.8,
      scalar: 0.8,
    });
  }, [allCompleted]);

  // Section-level celebration: a smaller, region-scoped confetti burst when
  // either Affirmations or Habits section turns all-complete. Mutually
  // exclusive with the full-page burst — when the toggle that flipped the
  // section to "all done" also flipped the page to all-done, only the page
  // burst plays (avoids visual pile-up).
  useSectionConfetti({
    active: affAllCompleted,
    sectionRef: affSectionRef,
    skipWhen: allCompleted,
    colors: ["#D4AF37", "#F3E5AB", "#C9A961", "#E5C97B"],
  });
  useSectionConfetti({
    active: mindAllCompleted,
    sectionRef: mindSectionRef,
    skipWhen: allCompleted,
    colors: ["#B48AA0", "#C7A6BB", "#9E7791", "#D8C1CE"],
  });
  useSectionConfetti({
    active: habAllCompleted,
    sectionRef: habSectionRef,
    skipWhen: allCompleted,
    colors: ["#8A9A86", "#A8B5A2", "#6F8267", "#C2CFBC"],
  });

  // ── Sub-tab state (BE → THINK → DO) ──────────────────────────────────────
  // Only one module's list shows at a time; tab click or horizontal swipe moves
  // between them. The last-viewed tab is remembered across sessions.
  const [tabIndex, setTabIndex] = useState<number>(() => {
    const i = TODAY_TABS.findIndex((t) => t.key === readLastTab());
    return i === -1 ? 0 : i;
  });
  const handleSelect = useCallback((i: number) => {
    setTabIndex(i);
    const key = TODAY_TABS[i]?.key;
    if (key) writeLastTab(key);
  }, []);

  const tasksByKey: Record<TodayTabKey, Task[]> = {
    affirmation: affirmations,
    mindset: mindsets,
    habit: habits,
  };
  const sectionRefByKey = {
    affirmation: affSectionRef,
    mindset: mindSectionRef,
    habit: habSectionRef,
  } as const;
  const tabs: TodayTab[] = TODAY_TABS.map((meta) => ({
    meta,
    stats: moduleStats(tasksByKey[meta.key]),
  }));

  // Bounded height so the pager scrolls each module list internally instead of
  // growing the document (the app scrolls the window, not `<main>`; with a plain
  // `h-full` this view collapses to content height and re-entering Today keeps
  // the previous tab's window scroll → lands mid/bottom of a long list).
  // Fill from this view's top down to `<main>`'s bottom padding (the fixed
  // bottom-nav clearance); re-measure on mount, resize, and orientation change.
  const rootRef = useRef<HTMLDivElement>(null);
  const [fillHeight, setFillHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const main = root?.closest("main");
    if (!main) return;
    const recompute = () => {
      const top = main.getBoundingClientRect().top;
      const reserve = parseFloat(getComputedStyle(main).paddingBottom) || 0;
      setFillHeight(computeFillHeight(window.innerHeight, top, reserve));
    };
    window.scrollTo(0, 0); // land at the top when (re)entering Today
    recompute();
    // One more after paint, in case chrome above (prompt/banner) settled late.
    const raf = requestAnimationFrame(recompute);
    window.addEventListener("resize", recompute);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", recompute);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="flex flex-col pt-4"
      style={{ height: fillHeight ?? undefined }}
    >
      <p className="text-xs text-[#8C8C8C] font-light tracking-wide italic mb-5 flex-shrink-0">
        You are what you repeatedly do.
      </p>

      {/* 全天全部完成的庆祝横幅（基于全 3 模块，非仅当前 tab） */}
      <AnimatePresence>
        {allCompleted && (
          <motion.div
            key="all-completed"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="mb-4 py-4 text-center relative flex-shrink-0"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#F0EFEA] to-transparent opacity-50" />
            <p className="font-serif text-lg text-[#8A9A86] italic tracking-widest relative z-10">
              All completed.
            </p>
            <p className="text-[10px] text-[#A09E9A] tracking-[0.2em] uppercase mt-2 relative z-10">
              A day well spent
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <TodayTabBar tabs={tabs} activeIndex={tabIndex} onSelect={handleSelect} />

      <TodayPager index={tabIndex} onIndexChange={handleSelect}>
        {TODAY_TABS.map((meta) => {
          const catTasks = tasksByKey[meta.key];
          return (
            <div
              key={meta.key}
              ref={sectionRefByKey[meta.key]}
              className="pt-2 pb-6"
            >
              {catTasks.length === 0 ? (
                <div className="py-16 text-center">
                  <p className="font-serif italic text-sm text-[#B0ADA5]">
                    Nothing here yet.
                  </p>
                </div>
              ) : (
                catTasks.map((task: Task) => (
                  <div key={task.id}>
                    <TaskRow
                      task={task}
                      category={meta.key}
                      missedDays={getMissed(task.habitId)}
                      onToggle={() => store.toggleTaskCompletion(task.id)}
                    />
                  </div>
                ))
              )}
            </div>
          );
        })}
      </TodayPager>
    </div>
  );
}
