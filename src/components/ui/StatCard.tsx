interface StatCardProps {
  label: string;
  value: number;
  tone: 'sky' | 'amber' | 'emerald' | 'brand';
  onClick?: () => void;
}

const TONE_STYLES: Record<StatCardProps['tone'], string> = {
  sky: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 dark:border dark:border-sky-800/30',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 dark:border dark:border-amber-800/30',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border dark:border-emerald-800/30',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300 dark:border dark:border-brand-800/30',
};

export function StatCard({ label, value, tone, onClick }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl p-4 sm:p-5 text-left transition-all duration-150 shadow-xs hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${TONE_STYLES[tone]} ${
        onClick ? 'cursor-pointer hover:brightness-[0.97]' : 'cursor-default'
      }`}
    >
      <div className="font-mono-tabular text-2xl sm:text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs sm:text-sm font-medium">{label}</div>
      {onClick && (
        <div className="mt-3 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide opacity-75">
          Tap to view →
        </div>
      )}
    </button>
  );
}
