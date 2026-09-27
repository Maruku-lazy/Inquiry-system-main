import { useState } from 'react';

export interface StatusSlice {
  id: string;
  label: string;
  count: number;
  color: string;
}

interface StatusDonutChartProps {
  data: StatusSlice[];
  title?: string;
  headerActionText?: string;
  onHeaderAction?: () => void;
  bottomCaption?: string;
  onSelectStatus?: (statusId: string | null) => void;
  selectedStatus?: string | null;
  size?: number;
}

export function StatusDonutChart({
  data,
  title = 'STATUS DISTRIBUTION',
  headerActionText = 'click to rank ↓',
  onHeaderAction,
  bottomCaption = 'Click to filter members ↓',
  onSelectStatus,
  selectedStatus,
  size = 140,
}: StatusDonutChartProps) {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  const total = data.reduce((sum, item) => sum + item.count, 0);

  // Donut geometry
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedAngle = 0;

  return (
    <div className="flex h-full flex-col justify-between">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {title}
        </h3>
        {headerActionText && (
          <button
            type="button"
            onClick={onHeaderAction}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {headerActionText}
          </button>
        )}
      </div>

      {/* Donut and Legend Grid */}
      <div className="flex flex-1 items-center justify-between gap-3 py-1">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="-rotate-90 transform"
          >
            {/* Background circle if total is 0 */}
            {total === 0 && (
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-slate-100 dark:text-slate-800"
              />
            )}

            {/* Segments */}
            {data.map((slice) => {
              if (slice.count <= 0 || total === 0) return null;

              const percentage = slice.count / total;
              const strokeDasharray = `${percentage * circumference} ${circumference}`;
              const strokeDashoffset = -accumulatedAngle * circumference;
              accumulatedAngle += percentage;

              const isHovered = hoveredSlice === slice.id;
              const isSelected = selectedStatus === slice.id;

              return (
                <circle
                  key={slice.id}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={isHovered || isSelected ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="cursor-pointer transition-all duration-200"
                  onMouseEnter={() => setHoveredSlice(slice.id)}
                  onMouseLeave={() => setHoveredSlice(null)}
                  onClick={() => {
                    const next = selectedStatus === slice.id ? null : slice.id;
                    onSelectStatus?.(next);
                  }}
                />
              );
            })}
          </svg>

          {/* Center text / count */}
          <div className="pointer-events-none absolute flex flex-col items-center justify-center text-center">
            <span className="font-mono-tabular text-xl font-bold text-slate-800 dark:text-slate-100">
              {hoveredSlice
                ? data.find((d) => d.id === hoveredSlice)?.count ?? total
                : total}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              {hoveredSlice
                ? data.find((d) => d.id === hoveredSlice)?.label
                : 'Total'}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-1 flex-col justify-center space-y-1.5 pr-1">
          {data.map((slice) => {
            const isHovered = hoveredSlice === slice.id;
            const isSelected = selectedStatus === slice.id;

            return (
              <button
                key={slice.id}
                type="button"
                className={`flex items-center justify-between rounded-lg px-2 py-1 text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-slate-100 font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                    : isHovered
                    ? 'bg-slate-50 text-slate-800 dark:bg-slate-800/60 dark:text-slate-200'
                    : 'text-slate-600 hover:bg-slate-50/70 dark:text-slate-400 dark:hover:bg-slate-800/40'
                }`}
                onMouseEnter={() => setHoveredSlice(slice.id)}
                onMouseLeave={() => setHoveredSlice(null)}
                onClick={() => {
                  const next = selectedStatus === slice.id ? null : slice.id;
                  onSelectStatus?.(next);
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="truncate">{slice.label}</span>
                </div>
                <span className="font-mono-tabular font-medium text-slate-700 dark:text-slate-300">
                  {slice.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Caption */}
      {bottomCaption && (
        <div className="mt-1 text-center text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {bottomCaption}
        </div>
      )}
    </div>
  );
}
