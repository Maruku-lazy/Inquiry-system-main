import { useEffect, useRef, useState } from 'react';
import { exportAnalytics, type AnalyticsRole, type ExportFormat } from '../../api/inquiries';

interface AnalyticsExportButtonProps {
  year: number;
  month: number | null;
  role: AnalyticsRole;
}

const FORMATS: { value: ExportFormat; label: string }[] = [
  { value: 'xlsx', label: 'Excel' },
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word' },
];

// Exports whatever the Analytics page is currently showing — no separate
// Year/Month/Week scope modal like the Inquiries export has, since the
// scope here is already fully visible and adjustable right on the page.
export function AnalyticsExportButton({ year, month, role }: AnalyticsExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  async function handleExport(format: ExportFormat) {
    setError(null);
    setExportingFormat(format);
    try {
      await exportAnalytics(year, month ?? undefined, role, format);
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    } finally {
      setExportingFormat(null);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Export
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="border-b border-slate-100 px-4 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Export as</p>
          </div>
          <div className="p-1.5">
            {FORMATS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => handleExport(f.value)}
                disabled={exportingFormat !== null}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {f.label}
                {exportingFormat === f.value && <span className="text-xs text-slate-400">Exporting…</span>}
              </button>
            ))}
          </div>
          {error && <p className="border-t border-slate-100 px-4 py-2.5 text-xs text-rose-600">{error}</p>}
        </div>
      )}
    </div>
  );
}
