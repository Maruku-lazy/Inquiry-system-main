import { useState } from 'react';

export interface WeekDataPoint {
  week: string; // "Wk 1", "Wk 2", etc.
  total: number;
  resolved: number;
}

interface WeeklyVolumeChartProps {
  data: WeekDataPoint[];
  title?: string;
  maxY?: number;
}

export function WeeklyVolumeChart({
  data,
  title = 'WEEKLY VOLUME',
  maxY = 12,
}: WeeklyVolumeChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG dimensions
  const width = 380;
  const height = 180;
  const paddingLeft = 32;
  const paddingRight = 24;
  const paddingTop = 16;
  const paddingBottom = 28;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const maxVal = Math.max(maxY, ...data.map((d) => Math.max(d.total, d.resolved, 0)), 1);
  let ceiling = 12;
  if (maxVal > 80) ceiling = Math.ceil(maxVal / 20) * 20;
  else if (maxVal > 40) ceiling = Math.ceil(maxVal / 10) * 10;
  else if (maxVal > 16) ceiling = Math.ceil(maxVal / 4) * 4;
  else if (maxVal > 8) ceiling = 16;

  const yTicks = [0, Math.round(ceiling * 0.25), Math.round(ceiling * 0.5), Math.round(ceiling * 0.75), ceiling];
  const effectiveMaxY = ceiling;

  // Calculate coordinates for points
  const points = data.map((d, index) => {
    const x = paddingLeft + (index / Math.max(data.length - 1, 1)) * chartWidth;
    const yTotal = paddingTop + chartHeight - (d.total / effectiveMaxY) * chartHeight;
    const yResolved = paddingTop + chartHeight - (d.resolved / effectiveMaxY) * chartHeight;
    return { x, yTotal, yResolved, ...d };
  });

  // Helper to create a smooth cubic spline path string
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const totalPath = createSmoothPath(points.map((p) => ({ x: p.x, y: p.yTotal })));
  const resolvedPath = createSmoothPath(points.map((p) => ({ x: p.x, y: p.yResolved })));

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {title}
        </h3>
        <div className="flex items-center gap-3 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            Total
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
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
            const y = paddingTop + chartHeight - (tick / effectiveMaxY) * chartHeight;
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
                  {tick}
                </text>
              </g>
            );
          })}

          {/* Spline Lines */}
          <path
            d={totalPath}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />
          <path
            d={resolvedPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {/* Data Points and Interaction */}
          {points.map((p, idx) => (
            <g
              key={p.week}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
              className="cursor-pointer"
            >
              {/* Invisible touch/hover target */}
              <rect
                x={p.x - 16}
                y={paddingTop}
                width={32}
                height={chartHeight}
                fill="transparent"
              />

              {/* Hover vertical indicator line */}
              {hoveredIndex === idx && (
                <line
                  x1={p.x}
                  y1={paddingTop}
                  x2={p.x}
                  y2={paddingTop + chartHeight}
                  stroke="#94a3b8"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
              )}

              {/* Total dot */}
              <circle
                cx={p.x}
                cy={p.yTotal}
                r={hoveredIndex === idx ? 5 : 3.5}
                className="fill-blue-500 stroke-white dark:stroke-slate-900 transition-all"
                strokeWidth="1.5"
              />

              {/* Resolved dot */}
              <circle
                cx={p.x}
                cy={p.yResolved}
                r={hoveredIndex === idx ? 5 : 3.5}
                className="fill-emerald-500 stroke-white dark:stroke-slate-900 transition-all"
                strokeWidth="1.5"
              />

              {/* X Axis label */}
              <text
                x={p.x}
                y={height - 6}
                textAnchor="middle"
                className={`font-mono text-[10px] transition-colors ${
                  hoveredIndex === idx
                    ? 'fill-slate-800 dark:fill-slate-100 font-semibold'
                    : 'fill-slate-400 dark:fill-slate-500'
                }`}
              >
                {p.week}
              </text>
            </g>
          ))}
        </svg>

        {/* Floating Tooltip */}
        {hoveredIndex !== null && points[hoveredIndex] && (
          <div
            className="pointer-events-none absolute -top-8 rounded-lg border border-slate-200 bg-white/95 px-2.5 py-1 text-xs shadow-md backdrop-blur dark:border-slate-700 dark:bg-slate-800/95 z-10 -translate-x-1/2 transition-all duration-150"
            style={{
              left: `${(points[hoveredIndex].x / width) * 100}%`,
            }}
          >
            <div className="font-semibold text-slate-800 dark:text-slate-100">
              {points[hoveredIndex].week}
            </div>
            <div className="flex gap-2 text-[11px]">
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                Total: {points[hoveredIndex].total}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                Res: {points[hoveredIndex].resolved}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
