import type { TodayTabMeta, ModuleStats } from '../lib/todayTabs';

export interface TodayTab {
  meta: TodayTabMeta;
  stats: ModuleStats;
}

interface TodayTabBarProps {
  tabs: TodayTab[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/**
 * B3 sub-tab bar for the Today page. One row of three tabs (Affirm / Mindset /
 * Habits); each tab's bottom underline doubles as a progress bar filled with
 * the module's semantic color to the module's completion percentage. Below the
 * bar sits an italic serif explanation of the active module (Identity / Belief
 * / Action). Presentational only — parent owns the active index + selection.
 */
export default function TodayTabBar({
  tabs,
  activeIndex,
  onSelect,
}: TodayTabBarProps) {
  const active = tabs[activeIndex];

  return (
    <div className="flex-shrink-0">
      <div className="flex gap-5" role="tablist" aria-label="Today modules">
        {tabs.map((tab, i) => {
          const selected = i === activeIndex;
          const { meta, stats } = tab;
          return (
            <button
              key={meta.key}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={`${meta.name}, ${stats.done} of ${stats.total} done`}
              onClick={() => onSelect(i)}
              className="relative flex-1 pb-3 text-left cursor-pointer"
            >
              <span className="flex justify-between items-baseline">
                <span
                  className={`text-[10px] tracking-[0.12em] uppercase font-semibold transition-colors ${
                    selected ? 'text-[#1A1A1A]' : 'text-[#C8C5BD]'
                  }`}
                >
                  {meta.label}
                </span>
                <span
                  className={`text-[9px] tabular-nums transition-colors ${
                    selected ? 'text-[#A6A29A]' : 'text-[#C8C5BD]'
                  }`}
                >
                  {stats.done}/{stats.total}
                </span>
              </span>
              {/* track */}
              <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded bg-[#EFEBE3]" />
              {/* progress fill = semantic color to completion % */}
              <span
                className="absolute left-0 bottom-0 h-[2px] rounded transition-[width,opacity] duration-300"
                style={{
                  width: `${stats.pct}%`,
                  background: meta.color,
                  opacity: selected ? 1 : 0.5,
                }}
              />
            </button>
          );
        })}
      </div>

      {active && (
        <p
          className="font-serif italic text-xs pt-4 pb-0.5 tracking-[0.02em] transition-colors"
          style={{ color: active.meta.color }}
        >
          {active.meta.sub}
        </p>
      )}
    </div>
  );
}
