import { useState } from 'react';

export interface ComparisonGroup {
  id: string;
  name: string; // e.g. "Alice Chen's Team", "Eve Johnson's Team"
  total: number;
  resolved: number;
}

interface TeamComparisonChartProps {
  data: ComparisonGroup[];
  title?: string;
  onSelectGroup?: (group: ComparisonGroup) => void;
}

export function TeamComparisonChart({
  data,
  title = 'TEAM COMPARISON',
  onSelectGroup,
}: TeamComparisonChartProps) {
  const [hoveredGroupId, setHoveredGroupId] = useState<string | null>(null);

  // SVG dimensions
  const width = 380;
  const height = 180;
  const paddingLeft = 32;
  const paddingRight = 24;
  const paddingTop = 16;
  const paddingBottom = 28;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Compute clean dynamic ceiling for Y-axis
  const rawMax = Math.max(1, ...data.map((d) => Math.max(d.total, d.resolved)));
  let ceiling = 16;
  if (rawMax <= 8) ceiling = 8;
  else if (rawMax <= 16) ceiling = 16;
  else if (rawMax <= 30) ceiling = 30;
  else if (rawMax <= 50) ceiling = 50;
  else if (rawMax <= 80) ceiling = 80;
  else if (rawMax <= 100) ceiling = 100;
  else ceiling = Math.ceil(rawMax / 25) * 25;

  const step = ceiling / 4;
  const yTicks = [0, step, step * 2, step * 3, ceiling];

  const groupCount = Math.max(data.length, 1);
  const slotWidth = chartWidth / groupCount;
  const barWidth = Math.min(22, Math.max(12, (slotWidth - 28) / 2));

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {title}
        </h3>
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-blue-300 dark:bg-blue-400" />
            Total
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Resolved
          </span>
        </div>
      </div>

      <div className="relative flex-1 w-full min-h-[170px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-full w-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Y Axis Grid Lines and Labels */}
          {yTicks.map((tick) => {
            const y = paddingTop + chartHeight - (tick / ceiling) * chartHeight;
            return (
              <g key={tick} className="text-slate-300 dark:text-slate-600">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="2 2"
                  strokeWidth="0.8"
                  opacity={0.7}
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 font-mono text-[10px]"
                >
                  {Math.round(tick)}
                </text>
              </g>
            );
          })}

          {/* Groups and Clustered Bars */}
          {data.map((group, idx) => {
            const groupCenterX = paddingLeft + (idx + 0.5) * slotWidth;
            const isHovered = hoveredGroupId === group.id;

            const totalHeight = (group.total / ceiling) * chartHeight;
            const resolvedHeight = (group.resolved / ceiling) * chartHeight;

            const totalX = groupCenterX - barWidth - 1.5;
            const resolvedX = groupCenterX + 1.5;

            const totalY = paddingTop + chartHeight - totalHeight;
            const resolvedY = paddingTop + chartHeight - resolvedHeight;

            // Shorten team name if long (e.g., "Alice Chen's Team" -> "Alice Chen")
            const displayName = group.name.replace(/'s Team$/i, '').replace(/^Team\s+/i, '');

            return (
              <g
                key={group.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredGroupId(group.id)}
                onMouseLeave={() => setHoveredGroupId(null)}
                onClick={() => onSelectGroup?.(group)}
              >
                {/* Column background hover highlight */}
                <rect
                  x={groupCenterX - slotWidth * 0.45}
                  y={paddingTop}
                  width={slotWidth * 0.9}
                  height={chartHeight}
                  rx="6"
                  className={`transition-colors duration-150 ${
                    isHovered
                      ? 'fill-blue-50/70 dark:fill-blue-950/30'
                      : 'fill-transparent'
                  }`}
                />

                {/* Total Bar (Light Blue) */}
                <rect
                  x={totalX}
                  y={Math.min(totalY, paddingTop + chartHeight - (group.total > 0 ? 3 : 0))}
                  width={barWidth}
                  height={Math.max(totalHeight, group.total > 0 ? 3 : 0)}
                  rx="3"
                  className={`transition-all duration-200 ${
                    isHovered
                      ? 'fill-blue-400 dark:fill-blue-400'
                      : 'fill-blue-300 dark:fill-blue-400/80'
                  }`}
                />

                {/* Resolved Bar (Emerald Green) */}
                <rect
                  x={resolvedX}
                  y={Math.min(resolvedY, paddingTop + chartHeight - (group.resolved > 0 ? 3 : 0))}
                  width={barWidth}
                  height={Math.max(resolvedHeight, group.resolved > 0 ? 3 : 0)}
                  rx="3"
                  className={`transition-all duration-200 ${
                    isHovered
                      ? 'fill-emerald-600 dark:fill-emerald-400'
                      : 'fill-emerald-500 dark:fill-emerald-500'
                  }`}
                />

                {/* X Axis Label */}
                <text
                  x={groupCenterX}
                  y={height - 8}
                  textAnchor="middle"
                  className={`text-[10px] transition-colors ${
                    isHovered
                      ? 'fill-slate-900 dark:fill-slate-100 font-semibold'
                      : 'fill-slate-500 dark:fill-slate-400 font-medium'
                  }`}
                >
                  {displayName}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Popover Tooltip */}
        {hoveredGroupId && (() => {
          const hoveredIdx = data.findIndex((d) => d.id === hoveredGroupId);
          const hoveredGroup = data[hoveredIdx];
          if (!hoveredGroup) return null;

          const groupCenterX = paddingLeft + (hoveredIdx + 0.5) * slotWidth;
          const leftPercent = (groupCenterX / width) * 100;

          return (
            <div
              className="pointer-events-none absolute -top-8 z-20 -translate-x-1/2 rounded-xl border border-slate-200 bg-white/95 px-3 py-1.5 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 animate-in fade-in zoom-in-95 duration-150"
              style={{ left: `${leftPercent}%` }}
            >
              <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {hoveredGroup.name}
              </div>
              <div className="mt-0.5 flex gap-3 text-[11px] font-semibold">
                <span className="text-blue-500 dark:text-blue-400">
                  Total: {hoveredGroup.total}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  Resolved: {hoveredGroup.resolved}
                </span>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
