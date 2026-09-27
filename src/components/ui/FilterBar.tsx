import type { InquiryStatus } from '../../types';
import { STATUS_LABELS } from '../../types';
import type { InquiryFilters } from '../../api/inquiries';

interface FilterBarProps {
  filters: InquiryFilters;
  onChange: (filters: InquiryFilters) => void;
}

const STATUS_OPTIONS: (InquiryStatus | 'all')[] = ['all', 'new', 'ongoing', 'completed'];

export function FilterBar({ filters, onChange }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex gap-1.5">
        {STATUS_OPTIONS.map((option) => {
          const active = option === 'all' ? !filters.status : filters.status === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange({ ...filters, status: option === 'all' ? undefined : option })}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {option === 'all' ? 'All' : STATUS_LABELS[option]}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-end gap-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">From</label>
          <input
            type="date"
            value={filters.date_from ?? ''}
            onChange={(e) => onChange({ ...filters, date_from: e.target.value || undefined })}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">To</label>
          <input
            type="date"
            value={filters.date_to ?? ''}
            onChange={(e) => onChange({ ...filters, date_to: e.target.value || undefined })}
            className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-slate-700 outline-none focus:border-brand-500"
          />
        </div>
      </div>
    </div>
  );
}
