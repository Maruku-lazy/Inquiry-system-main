import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { UserDetailModal } from '../components/ui/UserDetailModal';
import { RoleBadge } from '../components/ui/RoleBadge';
import { listUsers } from '../api/users';
import { getInquiryStatsByUser } from '../api/inquiries';
import type { InquiryStats, Role, User, UserInquiryStats } from '../types';
import { ROLE_LABELS } from '../types';
import { getDirectReports, getUnassignedLeaders, getUnassignedSales } from '../lib/hierarchy';
import { findUserStats } from '../lib/inquiryStats';
import { formatDateTime } from '../lib/format';

const EMPTY_STATS: InquiryStats = { total: 0, new: 0, ongoing: 0, completed: 0 };

const GROUP_ORDER: Role[] = ['admin', 'manager', 'leader', 'sales'];

const ROLE_FILTERS: { label: string; value: Role | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'System Administrator', value: 'admin' },
  { label: 'Sales Manager', value: 'manager' },
  { label: 'Sales Marketing Leader', value: 'leader' },
  { label: 'Sales Marketing Agent', value: 'sales' },
];

function UserRow({ user, onSelect }: { user: User; onSelect: (u: User) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(user)}
        className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-slate-50"
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-900">{user.name}</div>
          <div className="truncate text-xs text-slate-500">{user.email}</div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden font-mono-tabular text-[11px] text-slate-400 sm:inline">
            {formatDateTime(user.lastLoginAt)}
          </span>
          <RoleBadge role={user.role} compact />
        </div>
      </button>
    </li>
  );
}

// Hierarchical tree: Manager -> Leaders -> Sales reps, with an "Unassigned"
// bucket at the bottom for anyone not yet slotted into the chain.
function HierarchyView({
  users,
  onSelect,
}: {
  users: User[];
  onSelect: (u: User) => void;
}) {
  const managers = useMemo(() => users.filter((u) => u.role === 'manager'), [users]);
  const unassignedLeaders = useMemo(() => getUnassignedLeaders(users), [users]);
  const unassignedSales = useMemo(() => getUnassignedSales(users), [users]);

  return (
    <div className="space-y-4">
      {managers.map((manager) => {
        const managerLeaders = getDirectReports(users, manager);
        return (
          <div key={manager.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <button
              type="button"
              onClick={() => onSelect(manager)}
              className="flex items-center gap-2.5 hover:underline"
            >
              <span className="font-semibold text-slate-900">{manager.name}</span>
              <RoleBadge role="manager" compact />
            </button>

            {managerLeaders.length === 0 ? (
              <p className="mt-2 pl-4 text-xs text-slate-400">No leaders assigned yet.</p>
            ) : (
              <div className="mt-3 space-y-3 border-l-2 border-slate-100 pl-4">
                {managerLeaders.map((leader) => {
                  const salesReps = getDirectReports(users, leader);
                  return (
                    <div key={leader.id}>
                      <button
                        type="button"
                        onClick={() => onSelect(leader)}
                        className="flex items-center gap-2.5 hover:underline"
                      >
                        <span className="text-sm font-semibold text-slate-800">{leader.name}</span>
                        <RoleBadge role="leader" compact />
                      </button>
                      {salesReps.length === 0 ? (
                        <p className="mt-1 pl-4 text-xs text-slate-400">No marketing agents assigned yet.</p>
                      ) : (
                        <ul className="mt-1.5 space-y-1 border-l-2 border-slate-100 pl-4">
                          {salesReps.map((rep) => (
                            <li key={rep.id}>
                              <button
                                type="button"
                                onClick={() => onSelect(rep)}
                                className="flex items-center gap-2 text-sm text-slate-600 hover:text-brand-600 hover:underline"
                              >
                                {rep.name}
                                <RoleBadge role="sales" compact />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {(unassignedLeaders.length > 0 || unassignedSales.length > 0) && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-4">
          <h3 className="text-sm font-semibold text-slate-600">Unassigned</h3>
          <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {[...unassignedLeaders, ...unassignedSales].map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onSelect(u)}
                className="flex items-center gap-2 py-1 text-left text-sm text-slate-600 hover:text-brand-600 hover:underline"
              >
                {u.name}
                <RoleBadge role={u.role} compact />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function UserInformationPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [inquiryStats, setInquiryStats] = useState<UserInquiryStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [view, setView] = useState<'list' | 'hierarchy'>('list');
  const [detailUser, setDetailUser] = useState<User | null>(null);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([listUsers(), getInquiryStatsByUser()])
      .then(([{ users: userData }, { stats }]) => {
        setUsers(userData);
        setInquiryStats(stats);
      })
      .catch(() => setError('Could not load user information. Try refreshing the page.'))
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, search]);

  const grouped = useMemo(() => {
    const map = new Map<Role, User[]>();
    for (const role of GROUP_ORDER) map.set(role, []);
    for (const u of filtered) map.get(u.role)?.push(u);
    return map;
  }, [filtered]);

  return (
    <DashboardLayout title="User Information">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900">User Information</h2>
          <p className="mt-1 text-sm text-slate-500">
            Browse the organization read-only — for account changes, use User Management.
          </p>
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setView('list')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              List view
            </button>
            <button
              type="button"
              onClick={() => setView('hierarchy')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === 'hierarchy' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              Hierarchical view
            </button>
          </div>
        </div>

        {view === 'list' && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {ROLE_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setRoleFilter(f.value)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  roleFilter === f.value
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">{error}</div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
            Loading…
          </div>
        ) : view === 'hierarchy' ? (
          <HierarchyView users={filtered} onSelect={setDetailUser} />
        ) : (
          <div className="space-y-5">
            {GROUP_ORDER.map((role) => {
              const roleUsers = grouped.get(role) ?? [];
              if (roleUsers.length === 0) return null;
              return (
                <div key={role} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="mb-1 flex items-center gap-2 px-1">
                    <h3 className="text-sm font-semibold text-slate-700">{ROLE_LABELS[role]}</h3>
                    <span className="text-xs text-slate-400">({roleUsers.length})</span>
                  </div>
                  <ul className="divide-y divide-slate-50">
                    {roleUsers.map((u) => (
                      <UserRow key={u.id} user={u} onSelect={setDetailUser} />
                    ))}
                  </ul>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
                No accounts match your search.
              </div>
            )}
          </div>
        )}
      </div>

      <UserDetailModal
        open={detailUser !== null}
        onClose={() => setDetailUser(null)}
        user={detailUser}
        allUsers={users}
        stats={detailUser ? findUserStats(inquiryStats, detailUser.id) : EMPTY_STATS}
        readOnly
      />
    </DashboardLayout>
  );
}
