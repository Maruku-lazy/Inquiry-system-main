import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { getAnalytics, getInquiryStatsByUser } from '../api/inquiries';
import type { AnalyticsResponse, AnalyticsRole } from '../api/inquiries';
import { AnalyticsExportButton } from '../components/ui/AnalyticsExportButton';
import { WeeklyVolumeChart, type WeekDataPoint } from '../components/analytics/WeeklyVolumeChart';
import { TeamComparisonChart, type ComparisonGroup } from '../components/analytics/TeamComparisonChart';
import { StatusDonutChart, type StatusSlice } from '../components/analytics/StatusDonutChart';
import { TeamLeaderModal, type TeamLeaderDetail } from '../components/analytics/TeamLeaderModal';
import { SourceBreakdownCard } from '../components/analytics/SourceBreakdownCard';

const MONTHS = [
  'All Months',
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function AnalyticsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [year, setYear] = useState<number>(2026);
  const [month, setMonth] = useState<number | null>(8); // Default to August 2026 as in reference
  const [selectedRole] = useState<AnalyticsRole>('all');
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLeaderModal, setSelectedLeaderModal] = useState<TeamLeaderDetail | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);

  const isLeader = user?.role === 'leader';
  const isManagerOrAdmin = user?.role === 'manager' || user?.role === 'admin';
  const isSales = user?.role === 'sales';

  // Load analytics and user stats
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.allSettled([
      getAnalytics(year, month ?? undefined, selectedRole),
      getInquiryStatsByUser(),
    ])
      .then(([analyticsResult]) => {
        if (cancelled) return;
        if (analyticsResult.status === 'fulfilled') {
          setAnalytics(analyticsResult.value);
        } else {
          // Graceful fallback for offline / mock dev
          console.warn('Analytics endpoint fetch note:', analyticsResult.reason);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load analytics data.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year, month, selectedRole]);

  if (!user) return null;

  // ---------------------------------------------------------------------------
  // Data Modeling: Powered 100% by live PostgreSQL database records
  // ---------------------------------------------------------------------------

  const liveSummary = analytics?.summary;

  // Real Database Team Leaders
  const teamLeaders = useMemo(() => {
    if (analytics?.leaders && analytics.leaders.length > 0) {
      return analytics.leaders;
    }
    return [];
  }, [analytics]);

  // Real Database Specialists
  const allSpecialists = useMemo(() => {
    if (analytics?.specialists && analytics.specialists.length > 0) {
      return analytics.specialists;
    }
    return [];
  }, [analytics]);

  // Total counts directly from database
  const totalCount = liveSummary ? liveSummary.total : 0;
  const newCount = liveSummary ? liveSummary.new : 0;
  const inProgressCount = liveSummary ? liveSummary.ongoing : 0;
  const resolvedCount = liveSummary ? liveSummary.completed : 0;
  const resRatePercent = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;
  const criticalCount = analytics?.criticalCount ?? 0;

  // 1. Weekly Volume data from database
  const weeklyVolumeData: WeekDataPoint[] = useMemo(() => {
    if (analytics?.weekly && analytics.weekly.length > 0) {
      return analytics.weekly;
    }
    return [
      { week: 'Wk 1', total: 0, resolved: 0 },
      { week: 'Wk 2', total: 0, resolved: 0 },
      { week: 'Wk 3', total: 0, resolved: 0 },
      { week: 'Wk 4', total: 0, resolved: 0 },
    ];
  }, [analytics]);

  // 2. Comparison groups (Teams for Manager/Admin, Members for Leader)
  const comparisonGroups: ComparisonGroup[] = useMemo(() => {
    if (isLeader) {
      // Find this leader's own team members from database
      const myLeaderCard = teamLeaders.find((l) => l.detail.id === user.id || l.detail.name === user.name);
      if (myLeaderCard && myLeaderCard.detail.members.length > 0) {
        return myLeaderCard.detail.members.map((m) => ({
          id: m.id,
          name: m.name.split(' ')[0],
          total: m.total,
          resolved: m.resolved,
        }));
      }
      return allSpecialists.map((m) => ({
        id: m.id,
        name: m.name.split(' ')[0],
        total: m.total,
        resolved: m.resolved,
      }));
    }

    // Manager / Admin: Compare teams
    return teamLeaders.map((l) => ({
      id: l.detail.id,
      name: l.detail.teamName,
      total: l.total,
      resolved: l.done,
    }));
  }, [isLeader, user, teamLeaders, allSpecialists]);

  // 3. Status Distribution Slices from database
  const statusSlices: StatusSlice[] = useMemo(() => {
    if (liveSummary) {
      return [
        { id: 'new', label: 'New', count: liveSummary.new, color: '#06b6d4' },
        { id: 'ongoing', label: 'In Progress', count: liveSummary.ongoing, color: '#d97706' },
        { id: 'pending', label: 'Pending', count: liveSummary.pending, color: '#8b5cf6' },
        { id: 'completed', label: 'Resolved', count: liveSummary.completed, color: '#047857' },
      ];
    }
    return [
      { id: 'new', label: 'New', count: 0, color: '#06b6d4' },
      { id: 'ongoing', label: 'In Progress', count: 0, color: '#d97706' },
      { id: 'pending', label: 'Pending', count: 0, color: '#8b5cf6' },
      { id: 'completed', label: 'Resolved', count: 0, color: '#047857' },
    ];
  }, [liveSummary]);

  // Specialists list scoped for the current view
  const displayedSpecialists = useMemo(() => {
    let list = isLeader
      ? allSpecialists.filter((s) => s.leader === user.name)
      : allSpecialists;
    if (selectedStatusFilter) {
      if (selectedStatusFilter === 'new') list = list.filter((s) => s.new > 0);
      else if (selectedStatusFilter === 'ongoing') list = list.filter((s) => s.inProgress > 0);
      else if (selectedStatusFilter === 'pending') list = list.filter((s) => s.pending > 0);
      else if (selectedStatusFilter === 'completed') list = list.filter((s) => s.resolved > 0);
    }
    return list;
  }, [isLeader, user.name, selectedStatusFilter, allSpecialists]);

  return (
    <DashboardLayout title="Analytics">
      <div className="mx-auto max-w-[1440px] space-y-6 pb-12">
        {/* ================================================================= */}
        {/* Header: Title, Subtitle, Year/Month Selectors & Export            */}
        {/* ================================================================= */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl">
              {isLeader ? 'Team Analytics' : isSales ? 'My Analytics' : 'Organization Analytics'}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {isLeader
                ? `${user.name}'s Team · Managed by ${user.name} · ${displayedSpecialists.length} specialists`
                : isSales
                ? `Individual Performance · ${user.name}`
                : `${teamLeaders.length} teams · ${teamLeaders.length} leaders · ${allSpecialists.length} specialists`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {loading && (
              <span className="text-xs text-slate-400 animate-pulse mr-1">
                Loading…
              </span>
            )}
            {/* Year selector */}
            <div className="relative">
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>

            {/* Month selector */}
            <div className="relative">
              <select
                value={month ?? 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMonth(val === 0 ? null : val);
                }}
                className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3.5 pr-8 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {MONTHS.map((m, idx) => (
                  <option key={m} value={idx}>
                    {m}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>

            {/* Export button */}
            <AnalyticsExportButton year={year} month={month} role={selectedRole} />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/20 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* ================================================================= */}
        {/* Row of 5 Executive KPI Stat Cards                                 */}
        {/* ================================================================= */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {/* 1. TOTAL */}
          <div
            onClick={() => navigate('/inquiries/active')}
            className="group cursor-pointer rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
              TOTAL
            </div>
            <div className="mt-2 font-mono-tabular text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {totalCount}
            </div>
            <div className="mt-3 flex items-center text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
              TAP TO FILTER ↗
            </div>
          </div>

          {/* 2. NEW */}
          <div
            onClick={() => navigate('/inquiries/active')}
            className="group cursor-pointer rounded-2xl border border-cyan-100/80 bg-cyan-50/60 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-cyan-900/30 dark:bg-cyan-950/20"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-800/80 dark:text-cyan-400">
              NEW
            </div>
            <div className="mt-2 font-mono-tabular text-3xl font-bold tracking-tight text-cyan-600 dark:text-cyan-400">
              {newCount}
            </div>
            <div className="mt-3 flex items-center text-[10px] font-semibold uppercase tracking-wider text-cyan-600/70 transition-colors group-hover:text-cyan-700 dark:text-cyan-400 dark:group-hover:text-cyan-300">
              TAP TO FILTER ↗
            </div>
          </div>

          {/* 3. IN PROGRESS */}
          <div
            onClick={() => navigate('/inquiries/active')}
            className="group cursor-pointer rounded-2xl border border-amber-100/80 bg-amber-50/60 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-amber-900/30 dark:bg-amber-950/20"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800/80 dark:text-amber-400">
              IN PROGRESS
            </div>
            <div className="mt-2 font-mono-tabular text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-500">
              {inProgressCount}
            </div>
            <div className="mt-3 flex items-center text-[10px] font-semibold uppercase tracking-wider text-amber-600/70 transition-colors group-hover:text-amber-700 dark:text-amber-400 dark:group-hover:text-amber-300">
              TAP TO FILTER ↗
            </div>
          </div>

          {/* 4. RESOLVED */}
          <div
            onClick={() => navigate('/inquiries/completed')}
            className="group cursor-pointer rounded-2xl border border-emerald-100/80 bg-emerald-50/60 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-900/30 dark:bg-emerald-950/20"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-800/80 dark:text-emerald-400">
              RESOLVED
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="font-mono-tabular text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                {resolvedCount}
              </span>
            </div>
            <div className="mt-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              {resRatePercent}%
            </div>
            <div className="mt-1 flex items-center text-[10px] font-semibold uppercase tracking-wider text-emerald-600/70 transition-colors group-hover:text-emerald-700 dark:text-emerald-400 dark:group-hover:text-emerald-300">
              TAP TO FILTER ↗
            </div>
          </div>

          {/* 5. CRITICAL OPEN */}
          <div
            onClick={() => navigate('/inquiries/tasks')}
            className="group cursor-pointer rounded-2xl border border-rose-100/80 bg-rose-50/60 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-rose-900/30 dark:bg-rose-950/20"
          >
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-rose-800/80 dark:text-rose-400">
              CRITICAL OPEN
            </div>
            <div className="mt-2 font-mono-tabular text-3xl font-bold tracking-tight text-rose-600 dark:text-rose-400">
              {criticalCount}
            </div>
            <div className="mt-3 text-[11px] font-medium text-rose-600/80 dark:text-rose-400">
              needs attention
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3-Column Charts Row                                               */}
        {/* ================================================================= */}
        {/* ================================================================= */}
        {/* Charts Row: Role-aware layout with Source Breakdown               */}
        {/* ================================================================= */}
        {!isSales ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
            {/* Chart 1: Weekly Volume */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <WeeklyVolumeChart
                data={weeklyVolumeData}
                title={`WEEKLY VOLUME — ${month ? MONTHS[month].toUpperCase() : 'FULL YEAR'} ${year}`}
              />
            </div>

            {/* Chart 2: Team / Member Comparison */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <TeamComparisonChart
                data={comparisonGroups}
                title={isLeader ? 'MEMBER COMPARISON' : 'TEAM COMPARISON'}
                onSelectGroup={(grp) => {
                  if (!isLeader) {
                    const targetLeader = teamLeaders.find((l) => l.detail.id === grp.id)?.detail;
                    if (targetLeader) setSelectedLeaderModal(targetLeader);
                  }
                }}
              />
            </div>

            {/* Chart 3: Status Distribution */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <StatusDonutChart
                data={statusSlices}
                title="STATUS DISTRIBUTION"
                headerActionText="click to rank ↓"
                bottomCaption="Click to filter members ↓"
                selectedStatus={selectedStatusFilter}
                onSelectStatus={setSelectedStatusFilter}
                size={135}
              />
            </div>

            {/* Chart 4: Inquiries by Source */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <SourceBreakdownCard sources={analytics?.sources ?? []} />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {/* Chart 1: Weekly Volume */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <WeeklyVolumeChart
                data={weeklyVolumeData}
                title={`WEEKLY VOLUME — ${month ? MONTHS[month].toUpperCase() : 'FULL YEAR'} ${year}`}
              />
            </div>

            {/* Chart 2: Status Distribution */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <StatusDonutChart
                data={statusSlices}
                title="STATUS DISTRIBUTION"
                headerActionText="click to rank ↓"
                bottomCaption="Click to filter ↓"
                selectedStatus={selectedStatusFilter}
                onSelectStatus={setSelectedStatusFilter}
                size={135}
              />
            </div>

            {/* Chart 3: Inquiries by Source */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <SourceBreakdownCard sources={analytics?.sources ?? []} />
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* Team Leaders Section (Managers / Admins View)                     */}
        {/* ================================================================= */}
        {isManagerOrAdmin && (
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
              Team Leaders — <span className="font-normal lowercase text-slate-400">click a card to see team details</span>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {teamLeaders.map((item) => (
                <div
                  key={item.detail.id}
                  onClick={() => setSelectedLeaderModal(item.detail)}
                  className="group cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
                >
                  {/* Card Top: Avatar, Name, Team & Res. Pill */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-semibold text-white shadow-sm transition-transform group-hover:scale-105">
                        {item.detail.avatarInitials}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400 transition-colors">
                          {item.detail.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {item.detail.teamName}
                        </div>
                      </div>
                    </div>

                    <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/40">
                      {item.resRate}
                    </span>
                  </div>

                  {/* Card Middle: 5 Status Metrics */}
                  <div className="mt-5 grid grid-cols-5 text-center">
                    <div>
                      <div className="font-mono-tabular text-xl font-bold text-slate-800 dark:text-slate-100">
                        {item.total}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        TOTAL
                      </div>
                    </div>
                    <div>
                      <div className="font-mono-tabular text-xl font-bold text-cyan-600 dark:text-cyan-400">
                        {item.new}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        NEW
                      </div>
                    </div>
                    <div>
                      <div className="font-mono-tabular text-xl font-bold text-amber-600 dark:text-amber-400">
                        {item.active}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        ACTIVE
                      </div>
                    </div>
                    <div>
                      <div className="font-mono-tabular text-xl font-bold text-purple-600 dark:text-purple-400">
                        {item.pending}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        PENDING
                      </div>
                    </div>
                    <div>
                      <div className="font-mono-tabular text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {item.done}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        DONE
                      </div>
                    </div>
                  </div>

                  {/* Card Bottom: Progress Bar */}
                  <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-amber-500 transition-all duration-500 group-hover:bg-amber-600"
                      style={{ width: `${item.rateNum}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* Specialists Performance Table (Hidden for marketing/sales)        */}
        {/* ================================================================= */}
        {!isSales && (
          <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-base">
                {isLeader ? 'Team Specialists' : 'All Specialists'}
              </h2>
              {selectedStatusFilter && (
                <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                  <span>Filtered by status:</span>
                  <span className="font-semibold text-blue-600 uppercase dark:text-blue-400">
                    {selectedStatusFilter}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedStatusFilter(null)}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    (Clear)
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-500">
                <tr>
                  <th className="py-3 px-6">SPECIALIST</th>
                  {!isLeader && <th className="py-3 px-4">TEAM</th>}
                  {!isLeader && <th className="py-3 px-4">LEADER</th>}
                  <th className="py-3 px-4 text-center">TOTAL</th>
                  <th className="py-3 px-4 text-center text-cyan-600 dark:text-cyan-400">NEW</th>
                  <th className="py-3 px-4 text-center text-amber-600 dark:text-amber-400">IN PROGRESS</th>
                  <th className="py-3 px-4 text-center text-purple-600 dark:text-purple-400">PENDING</th>
                  <th className="py-3 px-4 text-center text-emerald-600 dark:text-emerald-400">RESOLVED</th>
                  <th className="py-3 px-6">RATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 dark:divide-slate-800 dark:text-slate-300">
                {displayedSpecialists.map((sp) => (
                  <tr
                    key={sp.id}
                    className="transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                  >
                    <td className="py-3.5 px-6 font-medium text-slate-900 dark:text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700 text-[11px] dark:bg-blue-950 dark:text-blue-300">
                          {sp.avatarInitials}
                        </span>
                        <span>{sp.name}</span>
                      </div>
                    </td>

                    {!isLeader && (
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {sp.team}
                      </td>
                    )}

                    {!isLeader && (
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                        {sp.leader}
                      </td>
                    )}

                    <td className="py-3.5 px-4 text-center font-bold text-slate-900 dark:text-slate-100 font-mono-tabular">
                      {sp.total}
                    </td>

                    <td className="py-3.5 px-4 text-center font-medium text-slate-500 dark:text-slate-400 font-mono-tabular">
                      {sp.new}
                    </td>

                    <td className="py-3.5 px-4 text-center font-medium text-slate-500 dark:text-slate-400 font-mono-tabular">
                      {sp.inProgress}
                    </td>

                    <td className="py-3.5 px-4 text-center font-medium text-slate-500 dark:text-slate-400 font-mono-tabular">
                      {sp.pending}
                    </td>

                    <td className="py-3.5 px-4 text-center font-medium text-slate-500 dark:text-slate-400 font-mono-tabular">
                      {sp.resolved}
                    </td>

                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              sp.rate >= 40
                                ? 'bg-amber-500'
                                : sp.rate > 0
                                ? 'bg-amber-500'
                                : 'bg-transparent'
                            }`}
                            style={{ width: `${sp.rate}%` }}
                          />
                        </div>
                        <span className="font-mono-tabular text-[11px] text-slate-500 dark:text-slate-400">
                          {sp.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

      {/* =================================================================== */}
      {/* Team Leader Drill-Down Modal                                       */}
      {/* =================================================================== */}
      <TeamLeaderModal
        leader={selectedLeaderModal}
        onClose={() => setSelectedLeaderModal(null)}
      />
    </DashboardLayout>
  );
}