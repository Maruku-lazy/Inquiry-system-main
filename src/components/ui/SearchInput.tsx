interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}

// Plain search box — auto-searches as you type (debounce the resulting
// value with useDebouncedValue where it's consumed). Used on pages that
// only need free-text search, not the full Type/Priority/Year/Month
// filter set (see InquiryFilterBar for that).
export function SearchInput({ value, onChange, placeholder, className = '' }: SearchInputProps) {
  return (
    <div className={`relative w-full max-w-sm ${className}`}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 dark:text-slate-500">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white py-2 pl-9.5 pr-8 text-sm text-slate-900 shadow-xs transition-all placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-3 focus:ring-brand-500/15 dark:border-white/15 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Clear search"
        >
          <span className="grid h-4 w-4 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300">
            ✕
          </span>
        </button>
      )}
    </div>
  );
}
