import { useMemo, useState } from 'react';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { backdropClickHandler } from './modalBackdrop';
import { exportInquiries, type ExportFormat, type ExportTab } from '../../api/inquiries';

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  tab: ExportTab;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'xlsx', label: 'Excel' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word' },
];

// Cascading scope picker: Year -> Month -> Week range. Each level is
// optional and only appears once its parent is set — leaving everything
// blank exports the full record set for the tab. Weeks are fixed
// day-of-month blocks (1-7, 8-14, 15-21, 22-28, 29-end of month), not
// Mon-Sun calendar weeks — see backend/src/utils/exportDateRange.js.
export function ExportModal({ open, onClose, tab }: ExportModalProps) {
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({ length: 6 }, (_, i) => currentYear - i), [currentYear]);

  const [format, setFormat] = useState<ExportFormat>('xlsx');
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [weekFrom, setWeekFrom] = useState('');
  const [weekTo, setWeekTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEscapeKey(onClose, open);
  if (!open) return null;

  function resetScope() {
    setYear('');
    setMonth('');
    setWeekFrom('');
    setWeekTo('');
  }

  function handleYearChange(v: string) {
    setYear(v);
    setMonth('');
    setWeekFrom('');
    setWeekTo('');
  }

  function handleMonthChange(v: string) {
    setMonth(v);
    setWeekFrom('');
    setWeekTo('');
  }

  function handleWeekFromChange(v: string) {
    setWeekFrom(v);
    if (weekTo && v && Number(v) > Number(weekTo)) setWeekTo(v);
  }

  async function handleExport() {
    setError(null);
    setExporting(true);
    try {
      await exportInquiries(tab, format, {
        year: year ? Number(year) : undefined,
        month: month ? Number(month) : undefined,
        weekFrom: weekFrom ? Number(weekFrom) : undefined,
        weekTo: weekTo ? Number(weekTo) : undefined,
      });
      resetScope();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  }

  const selectClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-white/15 dark:bg-slate-800 dark:text-white';
  const labelClass = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-xs px-4 animate-fade-in"
      onClick={backdropClickHandler(onClose)}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 sm:p-6 shadow-2xl animate-modal-enter dark:bg-slate-900 dark:border dark:border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Export Inquiries</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <div>
            <label className={labelClass}>Format</label>
            <div className="grid grid-cols-3 gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setFormat(f.value)}
                  className={`rounded-lg border px-3 py-2 text-center text-sm font-medium transition ${
                    format === f.value
                      ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelClass}>Year</label>
            <select value={year} onChange={(e) => handleYearChange(e.target.value)} className={selectClass}>
              <option value="">All years (full export)</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {year && (
            <div>
              <label className={labelClass}>Month</label>
              <select value={month} onChange={(e) => handleMonthChange(e.target.value)} className={selectClass}>
                <option value="">All months in {year}</option>
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {year && month && (
            <div>
              <label className={labelClass}>Weeks</label>
              <div className="grid grid-cols-2 gap-3">
                <select value={weekFrom} onChange={(e) => handleWeekFromChange(e.target.value)} className={selectClass}>
                  <option value="">Week 1</option>
                  {[1, 2, 3, 4, 5].map((w) => (
                    <option key={w} value={w}>
                      Week {w}
                    </option>
                  ))}
                </select>
                <select value={weekTo} onChange={(e) => setWeekTo(e.target.value)} className={selectClass}>
                  <option value="">Last week</option>
                  {[1, 2, 3, 4, 5]
                    .filter((w) => w >= Number(weekFrom || 1))
                    .map((w) => (
                      <option key={w} value={w}>
                        Week {w}
                      </option>
                    ))}
                </select>
              </div>
              <p className="mt-1.5 text-xs text-slate-400">
                Week 1 = days 1–7, Week 2 = 8–14, Week 3 = 15–21, Week 4 = 22–28, Week 5 = 29–end of
                month. Leave both blank for every week in {MONTH_NAMES[Number(month) - 1]}.
              </p>
            </div>
          )}

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}
