export interface ModuleTab {
  key: string;
  label: string; // short display label (uppercased in UI): "Affirm"
  sub: string; // italic serif explanation row
  color: string; // semantic accent hex
  badge: string; // right-aligned text — Today: "0/2" progress, Practice: "5" count
  fillPct: number; // underline fill % — Today: completion %, Practice: 100 (selection bar)
  ariaLabel: string; // accessible name for the tab button
}

interface ModuleTabBarProps {
  tabs: ModuleTab[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/**
 * B3 sub-tab bar shared by Today and Practice. One row of three tabs (Affirm /
 * Mindset / Habits); each tab's bottom underline is filled with the module's
 * semantic color — a daily-completion progress bar on Today, a full selection
 * bar on Practice. Below the bar sits an italic serif explanation of the active
 * module. Presentational only — the parent owns the active index + selection.
 */
export default function ModuleTabBar({
  tabs,
  activeIndex,
  onSelect,
}: ModuleTabBarProps) {
  const active = tabs[activeIndex];

  return (
    <div className="flex-shrink-0">
      <div className="flex gap-5" role="tablist" aria-label="Modules">
        {tabs.map((tab, i) => {
          const selected = i === activeIndex;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={tab.ariaLabel}
              onClick={() => onSelect(i)}
              className="relative flex-1 pb-3 text-left cursor-pointer"
            >
              <span className="flex justify-between items-baseline">
                <span
                  className={`text-[10px] tracking-[0.12em] uppercase font-semibold transition-colors ${
                    selected ? 'text-[#1A1A1A]' : 'text-[#C8C5BD]'
                  }`}
                >
                  {tab.label}
                </span>
                <span
                  className={`text-[9px] tabular-nums transition-colors ${
                    selected ? 'text-[#A6A29A]' : 'text-[#C8C5BD]'
                  }`}
                >
                  {tab.badge}
                </span>
              </span>
              {/* track */}
              <span className="absolute left-0 right-0 bottom-0 h-[2px] rounded bg-[#EFEBE3]" />
              {/* fill = semantic color; width is progress (Today) or full (Practice) */}
              <span
                className="absolute left-0 bottom-0 h-[2px] rounded transition-[width,opacity] duration-300"
                style={{
                  width: `${tab.fillPct}%`,
                  background: tab.color,
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
          style={{ color: active.color }}
        >
          {active.sub}
        </p>
      )}
    </div>
  );
}
