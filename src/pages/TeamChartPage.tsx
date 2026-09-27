import { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { getOrgChart } from '../api/organization';
import type { OrgChart } from '../types';

function SelfPill() {
  return (
    <span className="ml-2 inline-block rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
      You
    </span>
  );
}

function NameRow({ name, isSelf, id }: { name: string; isSelf: boolean; id: string | null }) {
  const isPlaceholder = id === null;
  return (
    <span
      className={`inline-flex items-center ${
        isSelf
          ? 'rounded-lg bg-brand-50 px-2 py-1 font-semibold text-brand-800 ring-1 ring-brand-200'
          : isPlaceholder
            ? 'italic text-slate-400'
            : 'text-slate-700'
      }`}
    >
      {name}
      {isSelf && <SelfPill />}
    </span>
  );
}

export function TeamChartPage() {
  const [chart, setChart] = useState<OrgChart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getOrgChart()
      .then(setChart)
      .catch(() => setError('Could not load the team chart. Try refreshing the page.'))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <DashboardLayout title="Organization — Team Chart">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Team Chart</h2>
          <p className="mt-1 text-sm text-slate-500">Where you stand in the hierarchy.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : !chart || chart.managers.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            Nothing to show yet.
          </div>
        ) : (
          <div className="space-y-4">
            {chart.managers.map((manager) => (
              <div key={manager.id ?? 'no-manager'} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    Manager
                  </span>
                </div>
                <div className="mt-1">
                  <NameRow name={manager.name} isSelf={manager.isSelf} id={manager.id} />
                </div>

                <div className="mt-3 space-y-3 border-l-2 border-slate-100 pl-4">
                  {manager.leaders.map((leader) => (
                    <div key={leader.id ?? 'no-leader'}>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Leader
                      </span>
                      <div className="mt-0.5">
                        <NameRow name={leader.name} isSelf={leader.isSelf} id={leader.id} />
                      </div>

                      {leader.salesReps.length === 0 ? (
                        <p className="mt-1.5 pl-4 text-xs text-slate-400">No marketing agents yet.</p>
                      ) : (
                        <ul className="mt-1.5 flex flex-wrap gap-2 border-l-2 border-slate-100 pl-4">
                          {leader.salesReps.map((rep) => (
                            <li key={rep.id}>
                              <NameRow name={rep.name} isSelf={rep.isSelf} id={rep.id} />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
