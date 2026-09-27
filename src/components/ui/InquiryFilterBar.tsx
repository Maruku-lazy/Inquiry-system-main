import { INQUIRY_TYPE_LABELS, PRIORITY_LABELS } from '../../types';
import type { InquiryType, Priority } from '../../types';

export interface InquiryFiltersState {
  q: string;
  type: '' | InquiryType;
  priority: '' | Priority;
  postedYear: string;
  postedMonth: string;
}

export const EMPTY_INQUIRY_FILTERS: InquiryFiltersState = {
  q: '',
  type: '',
  priority: '',
  postedYear: '',
  postedMonth: '',
};

interface InquiryFilterBarProps {
  value: InquiryFiltersState;
  onChange: (next: InquiryFiltersState) => void;
  /** Whether the search box should also match the assigned rep's name — Leader/Manager/Admin only. */
  canSearchAssignee: boolean;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Search + 4 independent filter dropdowns (Type, Priority, Year, Month —
// Year/Month based on Date Posted i.e. createdAt). Search fires live as
// the person types (debounced upstream via useDebouncedValue); each
// dropdown filters independently and combines with the others (AND).
export function InquiryFilterBar({ value, onChange, canSearchAssignee }: InquiryFilterBarProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  function set<K extends keyof InquiryFiltersState>(key: K, v: InquiryFiltersState[K]) {
    const next = { ...value, [key]: v };
    // Month is meaningless without a year selected.
    if (key === 'postedYear' && !v) next.postedMonth = '';
    onChange(next);
  }

  const selectClass =
    'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-xs outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-white/15 dark:bg-slate-900 dark:text-slate-200';

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2.5">
      <div className="relative min-w-[240px] flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <input
          type="text"
          value={value.q}
          onChange={(e) => set('q', e.target.value)}
          placeholder={
            canSearchAssignee ? 'Search ID, customer, or assigned rep…' : 'Search ID or customer name…'
          }
          className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9.5 pr-8 text-sm text-slate-900 shadow-xs transition-all placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 dark:border-white/15 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
        />
        {value.q && (
          <button
            type="button"
            onClick={() => set('q', '')}
            className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Clear search"
          >
            <span className="grid h-4 w-4 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300">
              ✕
            </span>
          </button>
        )}
      </div>

      <select value={value.type} onChange={(e) => set('type', e.target.value as InquiryFiltersState['type'])} className={selectClass}>
        <option value="">All types</option>
        {(Object.entries(INQUIRY_TYPE_LABELS) as [InquiryType, string][]).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>

      <select
        value={value.priority}
        onChange={(e) => set('priority', e.target.value as InquiryFiltersState['priority'])}
        className={selectClass}
      >
        <option value="">All priorities</option>
        {(Object.entries(PRIORITY_LABELS) as [Priority, string][]).map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
      </select>

      <select value={value.postedYear} onChange={(e) => set('postedYear', e.target.value)} className={selectClass}>
        <option value="">All years</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>

      <select
        value={value.postedMonth}
        onChange={(e) => set('postedMonth', e.target.value)}
        disabled={!value.postedYear}
        className={`${selectClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <option value="">All months</option>
        {MONTH_NAMES.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
    </div>
  );
}
