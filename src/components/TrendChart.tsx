import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { Task } from '../types';
import { buildTrendSeries, TrendRange } from '../lib/trendData';

interface TrendChartProps {
  tasks: Task[]; // 已按分类筛选过的 tasks
  today?: Date;
}

const RANGES: { key: TrendRange; label: string }[] = [
  { key: '1w', label: '1W' },
  { key: '1m', label: '1M' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
  { key: 'all', label: 'ALL' },
];

// SVG 逻辑坐标（宽度用 100% 拉伸，preserveAspectRatio=none + non-scaling-stroke 保线宽）
const W = 320;
const H = 128;
const PAD_TOP = 16;
const PAD_BOTTOM = 10;

export default function TrendChart({ tasks, today = new Date() }: TrendChartProps) {
  const [range, setRange] = useState<TrendRange>('1m');
  const reduce = useReducedMotion();

  const points = buildTrendSeries(tasks, range, today);
  const n = points.length;
  const maxY = Math.max(1, ...points.map((p) => p.completed));
  const peak = Math.max(...points.map((p) => p.completed));
  const last = points[n - 1];
  const empty = points.every((p) => p.completed === 0);

  const x = (i: number) => (n === 1 ? W / 2 : (i / (n - 1)) * W);
  const y = (v: number) =>
    PAD_TOP + (1 - v / maxY) * (H - PAD_TOP - PAD_BOTTOM);

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.completed).toFixed(1)}`)
    .join(' ');
  const baseline = H - PAD_BOTTOM;
  const areaPath = `M${x(0).toFixed(1)},${baseline} ${points
    .map((p, i) => `L${x(i).toFixed(1)},${y(p.completed).toFixed(1)}`)
    .join(' ')} L${x(n - 1).toFixed(1)},${baseline} Z`;

  const startLabel = format(parseISO(points[0].date), 'MMM d');
  const lastX = x(n - 1);
  const lastY = y(last.completed);

  return (
    <div>
      {/* 标题 + 范围切换（股票 App 式 1W/1M/3M/6M/1Y/ALL）。
          6 档 + 标题挤一行手机会溢出，切换独立成行、全宽平铺。 */}
      <h2 className="text-[10px] font-medium text-[#A09E9A] uppercase tracking-[0.2em] mb-3">
        Completion Trend
      </h2>
      <div className="flex items-center justify-between mb-4 text-[10px] tracking-[0.12em] font-medium">
        {RANGES.map((r) => (
          <button
            key={r.key}
            onClick={() => setRange(r.key)}
            className={`transition-colors ${
              range === r.key
                ? 'text-[#1A1A1A]'
                : 'text-[#C4C1B9] hover:text-[#5C5A56]'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="w-full h-32 overflow-visible"
          role="img"
          aria-label={`完成任务数趋势，范围 ${range}，峰值 ${peak}，当前 ${last.completed}`}
        >
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8A9A86" stopOpacity="0.30" />
              <stop offset="100%" stopColor="#8A9A86" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* 基线 */}
          <line
            x1="0"
            y1={baseline}
            x2={W}
            y2={baseline}
            stroke="#EAE8E3"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          {/* 面积填充 */}
          <motion.path
            key={`area-${range}`}
            d={areaPath}
            fill="url(#trendFill)"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />

          {/* 曲线 */}
          <motion.path
            key={`line-${range}`}
            d={linePath}
            fill="none"
            stroke="#8A9A86"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
          />

          {/* 末点（最新读数，像股价最后一笔）*/}
          {!empty && (
            <circle
              cx={lastX}
              cy={lastY}
              r="3"
              fill="#8A9A86"
              stroke="#F9F8F6"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>

        {/* 峰值 / 当前 读数（叠在右上，绝对定位不受 SVG 拉伸影响）*/}
        {!empty && (
          <div className="absolute top-0 right-0 text-right leading-tight pointer-events-none">
            <div className="text-[9px] tracking-[0.15em] uppercase text-[#C4C1B9]">Today</div>
            <div className="text-lg font-serif text-[#1A1A1A]">{last.completed}</div>
          </div>
        )}

        {empty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[11px] italic text-[#B0ADA5] font-serif">
              No completions in this range yet.
            </span>
          </div>
        )}
      </div>

      {/* X 轴：起止日期 + 峰值提示 */}
      <div className="flex items-center justify-between mt-3 text-[9px] tracking-[0.12em] uppercase text-[#B4AEA2]">
        <span>{startLabel}</span>
        {!empty && <span className="text-[#A09E9A]">Peak {peak}</span>}
        <span>Today</span>
      </div>
    </div>
  );
}
