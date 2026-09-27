import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { AssignMembersModal } from '../components/ui/AssignMembersModal';
import { SearchInput } from '../components/ui/SearchInput';
import { assignSalesToLeader, getMyTeam } from '../api/organization';
import type { MyTeamUser } from '../api/organization';
import type { User } from '../types';

// AssignMembersModal only reads id/name/role/leaderId/managerId at runtime
// — these placeholder fields exist purely to satisfy the shared User type
// without duplicating the modal for a narrower shape.
function toUserShape(u: MyTeamUser, extra: Partial<User> = {}): User {
  return {
    id: u.id,
    name: u.name,
    role: u.role as User['role'],
    email: '',
    isActive: true,
    managerId: null,
    leaderId: u.leaderId ?? null,
    createdAt: '',
    lastLoginAt: null,
    ...extra,
  };
}

export function TeamManagementPage() {
  const [leaders, setLeaders] = useState<MyTeamUser[]>([]);
  const [salesReps, setSalesReps] = useState<MyTeamUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<MyTeamUser | null>(null);
  const [q, setQ] = useState('');

  const visibleLeaders = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return leaders;
    return leaders.filter((leader) => {
      if (leader.name.toLowerCase().includes(query)) return true;
      return salesReps.some((s) => s.leaderId === leader.id && s.name.toLowerCase().includes(query));
    });
  }, [leaders, salesReps, q]);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    getMyTeam()
      .then(({ leaders: l, salesReps: s }) => {
        setLeaders(l);
        setSalesReps(s);
      })
      .catch(() => setError('Could not load your team. Try refreshing the page.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Diffs the modal's final selection against current assignments under
  // this leader — same pattern as UsersPage's admin equivalent, just
  // calling the manager-scoped endpoint instead of the admin-only one.
  async function handleAssignConfirm(leaderId: string, selectedIds: string[]) {
    const currentReportIds = new Set(salesReps.filter((s) => s.leaderId === leaderId).map((s) => s.id));
    const selectedSet = new Set(selectedIds);

    const toAssign = selectedIds.filter((id) => !currentReportIds.has(id));
    const toUnassign = Array.from(currentReportIds).filter((id) => !selectedSet.has(id));

    await Promise.all([
      ...toAssign.map((id) => assignSalesToLeader(id, leaderId)),
      ...toUnassign.map((id) => assignSalesToLeader(id, null)),
    ]);
    load();
  }

  return (
    <DashboardLayout title="Organization — Team Management">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">Team Management</h2>
          <p className="mt-1 text-sm text-slate-500">
            Assign marketing agents to the leaders under you.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        {leaders.length > 0 && (
          <div className="mb-4">
            <SearchInput value={q} onChange={setQ} placeholder="Search leader or marketing agent name…" />
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : leaders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            No leaders assigned to you yet — ask your System Administrator to assign one.
          </div>
        ) : visibleLeaders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            No leaders or marketing agents match "{q}".
          </div>
        ) : (
          <div className="space-y-3">
            {visibleLeaders.map((leader) => {
              const reports = salesReps.filter((s) => s.leaderId === leader.id);
              return (
                <div
                  key={leader.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div>
                    <div className="font-semibold text-slate-900">{leader.name}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {reports.length} marketing agent{reports.length === 1 ? '' : 's'}
                      {reports.length > 0 && `: ${reports.map((r) => r.name).join(', ')}`}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignTarget(leader)}
                    className="shrink-0 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-brand-100"
                  >
                    Assign Marketing
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AssignMembersModal
        open={assignTarget !== null}
        onClose={() => setAssignTarget(null)}
        targetUser={assignTarget ? toUserShape(assignTarget, { role: 'leader' }) : null}
        allUsers={salesReps.map((s) => toUserShape(s, { role: 'sales' }))}
        onConfirm={(ids) => (assignTarget ? handleAssignConfirm(assignTarget.id, ids) : Promise.resolve())}
      />
    </DashboardLayout>
  );
}
