import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DashboardLayout } from '../../components/layout/DashboardLayout';
import { getCompletedMonths } from '../../api/inquiries';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function CompletedYearPage() {
  const { year } = useParams<{ year: string }>();
  const navigate = useNavigate();
  const [months, setMonths] = useState<{ month: number; total: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!year) return;
    setIsLoading(true);
    setError(null);
    getCompletedMonths(Number(year))
      .then(({ months: data }) => setMonths(data))
      .catch(() => setError('Could not load months. Try refreshing the page.'))
      .finally(() => setIsLoading(false));
  }, [year]);

  return (
    <DashboardLayout title={`Completed — ${year}`}>
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => navigate('/inquiries/completed')}
          className="mb-4 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          ← Back to years
        </button>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : months.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            No completed inquiries in {year}.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {months.map((m) => (
              <button
                key={m.month}
                type="button"
                onClick={() => navigate(`/inquiries/completed/${year}/${m.month}`)}
                className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:border-brand-300 hover:shadow-sm"
              >
                <div className="text-lg font-bold text-slate-900">{MONTH_NAMES[m.month - 1]}</div>
                <div className="mt-1 text-sm text-slate-500">{m.total} completed</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
