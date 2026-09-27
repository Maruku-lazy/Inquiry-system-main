import { useEffect } from 'react';
import { StatusDonutChart, type StatusSlice } from './StatusDonutChart';

export interface SpecialistMetric {
  id: string;
  name: string;
  avatarInitials: string;
  total: number;
  new: number;
  inProgress: number;
  pending: number;
  resolved: number;
  rate: number; // 0 to 100 percentage
}

export interface TeamLeaderDetail {
  id: string;
  name: string;
  teamName: string;
  avatarInitials: string;
  specialistsCount: number;
  monthLabel: string;
  year: number;
  members: SpecialistMetric[];
  statusDistribution: StatusSlice[];
}

interface TeamLeaderModalProps {
  leader: TeamLeaderDetail | null;
  onClose: () => void;
}

export function TeamLeaderModal({ leader, onClose }: TeamLeaderModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!leader) return null;

  // Maximum value for stacked bars
  const maxBarTotal = Math.max(
    4,
    ...leader.members.map((m) => m.new + m.inProgress + m.pending + m.resolved)
  );
  const yTicks = [0, 1, 2, 3, 4];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 font-semibold text-white shadow-sm">
              {leader.avatarInitials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {leader.name}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {leader.teamName} · {leader.specialistsCount} specialists · {leader.monthLabel} {leader.year}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            aria-label="Close dialog"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Charts Row */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Member Performance (Stacked Bar) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-800/30">
            <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              MEMBER PERFORMANCE
            </h3>

            <div className="relative mt-4 h-48 w-full pt-2">
              {/* Y Axis Grid Lines */}
              <div className="absolute inset-x-0 top-2 bottom-6 flex flex-col justify-between pointer-events-none">
                {yTicks
                  .slice()
                  .reverse()
                  .map((tick) => (
                    <div key={tick} className="flex items-center gap-2">
                      <span className="w-4 text-right font-mono text-[10px] text-slate-400 dark:text-slate-500">
                        {tick}
                      </span>
                      <div className="flex-1 border-t border-slate-200/80 dark:border-slate-700/60" />
                    </div>
                  ))}
              </div>

              {/* Stacked Bars */}
              <div className="relative ml-6 h-full pb-6 flex items-end justify-around">
                {leader.members.map((member) => {
                  const firstName = member.name.split(' ')[0];

                  return (
                    <div key={member.id} className="group relative flex h-full flex-1 flex-col items-center justify-end">
                      {/* Stacked Bar Container */}
                      <div className="flex w-6 flex-col-reverse overflow-hidden rounded-t-sm transition-transform group-hover:scale-105">
                        {/* Resolved (bottom) - green */}
                        {member.resolved > 0 && (
                          <div
                            className="w-full bg-emerald-500"
                            style={{ height: `${(member.resolved / maxBarTotal) * 150}px` }}
                            title={`Resolved: ${member.resolved}`}
                          />
                        )}
                        {/* In Progress - amber */}
                        {member.inProgress > 0 && (
                          <div
                            className="w-full bg-amber-500"
                            style={{ height: `${(member.inProgress / maxBarTotal) * 150}px` }}
                            title={`In Progress: ${member.inProgress}`}
                          />
                        )}
                        {/* Pending - purple */}
                        {member.pending > 0 && (
                          <div
                            className="w-full bg-purple-500"
                            style={{ height: `${(member.pending / maxBarTotal) * 150}px` }}
                            title={`Pending: ${member.pending}`}
                          />
                        )}
                        {/* New - cyan */}
                        {member.new > 0 && (
                          <div
                            className="w-full bg-cyan-500"
                            style={{ height: `${(member.new / maxBarTotal) * 150}px` }}
                            title={`New: ${member.new}`}
                          />
                        )}
                      </div>

                      {/* X Axis Label */}
                      <span className="absolute -bottom-5 text-center text-xs font-medium text-slate-600 dark:text-slate-300">
                        {firstName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Status Donut */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800/80 dark:bg-slate-800/30">
            <StatusDonutChart
              data={leader.statusDistribution}
              title="STATUS"
              headerActionText=""
              bottomCaption=""
              size={120}
            />
          </div>
        </div>

        {/* Specialists Table */}
        <div className="mt-5 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-500">
                <tr>
                  <th className="py-2.5 px-3">SPECIALIST</th>
                  <th className="py-2.5 px-3 text-center">TOTAL</th>
                  <th className="py-2.5 px-3 text-center text-cyan-600 dark:text-cyan-400">NEW</th>
                  <th className="py-2.5 px-3 text-center text-amber-600 dark:text-amber-400">IN PROG.</th>
                  <th className="py-2.5 px-3 text-center text-purple-600 dark:text-purple-400">PENDING</th>
                  <th className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400">RESOLVED</th>
                  <th className="py-2.5 px-3">RATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800 dark:text-slate-300">
                {leader.members.map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                        {member.avatarInitials}
                      </span>
                      <span>{member.name}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-900 dark:text-slate-100">
                      {member.total}
                    </td>
                    <td className="py-2.5 px-3 text-center text-cyan-600 dark:text-cyan-400 font-medium">
                      {member.new}
                    </td>
                    <td className="py-2.5 px-3 text-center text-amber-600 dark:text-amber-400 font-medium">
                      {member.inProgress}
                    </td>
                    <td className="py-2.5 px-3 text-center text-purple-600 dark:text-purple-400 font-medium">
                      {member.pending}
                    </td>
                    <td className="py-2.5 px-3 text-center text-emerald-600 dark:text-emerald-400 font-medium">
                      {member.resolved}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                          <div
                            className={`h-full rounded-full transition-all ${
                              member.rate >= 50
                                ? 'bg-emerald-500'
                                : member.rate > 0
                                ? 'bg-amber-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${member.rate}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {member.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
