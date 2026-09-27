export interface SourceMetric {
  source: string;
  label: string;
  total: number;
}

interface SourceBreakdownCardProps {
  sources: SourceMetric[];
  title?: string;
}

const SOURCE_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  social: { bar: 'bg-indigo-500', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30' },
  email: { bar: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-50 dark:bg-sky-950/30' },
  phone: { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
  physical: { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
};

export function SourceBreakdownCard({ sources, title = 'INQUIRIES BY SOURCE' }: SourceBreakdownCardProps) {
  const grandTotal = sources.reduce((sum, s) => sum + s.total, 0);

  // Default set of 4 channels if empty
  const displaySources = sources.length > 0 ? sources : [
    { source: 'social', label: 'Social Media', total: 0 },
    { source: 'email', label: 'Email', total: 0 },
    { source: 'phone', label: 'Phone', total: 0 },
    { source: 'physical', label: 'Physical', total: 0 },
  ];

  return (
    <div className="flex h-full flex-col justify-between">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
          {title}
        </h3>
        <span className="text-[11px] font-medium text-slate-400">
          {grandTotal} total
        </span>
      </div>

      <div className="space-y-3 pt-1">
        {displaySources.map((item) => {
          const percent = grandTotal > 0 ? Math.round((item.total / grandTotal) * 100) : 0;
          const color = SOURCE_COLORS[item.source] ?? {
            bar: 'bg-blue-500',
            text: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/30',
          };

          return (
            <div key={item.source} className="group">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono-tabular font-bold text-slate-900 dark:text-slate-100">
                    {item.total}
                  </span>
                  <span className="w-8 text-right font-mono text-[11px] text-slate-400">
                    {percent}%
                  </span>
                </div>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${color.bar}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
