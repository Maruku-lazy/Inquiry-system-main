import { useCallback, useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { UserFormModal } from '../components/ui/UserFormModal';
import { UserDetailModal } from '../components/ui/UserDetailModal';
import { AssignMembersModal } from '../components/ui/AssignMembersModal';
import { RoleBadge } from '../components/ui/RoleBadge';
import { SearchInput } from '../components/ui/SearchInput';
import { InquiryBulkActionBar, type SelectionPreset } from '../components/ui/InquiryBulkActionBar';
import { UndoSnackbar, type SnackbarState } from '../components/ui/UndoSnackbar';
import { createUser, deactivateUser, deleteUserAccount, listUsers, updateUser } from '../api/users';
import { getInquiryStatsByUser } from '../api/inquiries';
import type { InquiryStats, Role, User, UserInquiryStats } from '../types';
import { findUserStats } from '../lib/inquiryStats';
import { formatDateTime } from '../lib/format';
import { useAuth } from '../hooks/useAuth';

const ROLE_FILTERS: { label: string; value: Role | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'System Administrator', value: 'admin' },
  { label: 'Sales Manager', value: 'manager' },
  { label: 'Sales Marketing Leader', value: 'leader' },
  { label: 'Sales Marketing Agent', value: 'sales' },
];

const EMPTY_STATS: InquiryStats = { total: 0, new: 0, ongoing: 0, completed: 0 };

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [inquiryStats, setInquiryStats] = useState<UserInquiryStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [q, setQ] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [assignTarget, setAssignTarget] = useState<User | null>(null);

  const load = useCallback(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([listUsers(), getInquiryStatsByUser()])
      .then(([{ users: userData }, { stats }]) => {
        setUsers(userData);
        setInquiryStats(stats);
      })
      .catch(() => setError('Could not load accounts. Try refreshing the page.'))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [roleFilter, q]);

  const managers = useMemo(() => users.filter((u) => u.role === 'manager'), [users]);
  const leaders = useMemo(() => users.filter((u) => u.role === 'leader'), [users]);
  const visibleUsers = useMemo(() => {
    const byRole = roleFilter === 'all' ? users : users.filter((u) => u.role === roleFilter);
    const query = q.trim().toLowerCase();
    if (!query) return byRole;
    return byRole.filter(
      (u) => u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query),
    );
  }, [users, roleFilter, q]);

  function openCreate() {
    setEditingUser(null);
    setModalOpen(true);
  }

  function openEdit(user: User) {
    setDetailUser(null);
    setEditingUser(user);
    setModalOpen(true);
  }

  async function handleSubmit(values: {
    name: string;
    email: string;
    password?: string;
    role: Role;
    managerId?: string | null;
    leaderId?: string | null;
  }) {
    if (editingUser) {
      await updateUser(editingUser.id, values);
    } else {
      await createUser({ ...values, password: values.password ?? '' });
    }
    load();
  }

  async function handleToggleActive(user: User) {
    if (user.isActive) {
      await deactivateUser(user.id);
    } else {
      await updateUser(user.id, { isActive: true });
    }
    setDetailUser(null);
    load();
  }

  async function handleDeleteAccount(user: User) {
    await deleteUserAccount(user.id);
    setDetailUser(null);
    load();
  }

  async function handleAssignConfirm(targetUser: User, memberIds: string[]) {
    const field: 'managerId' | 'leaderId' = targetUser.role === 'manager' ? 'managerId' : 'leaderId';
    const currentReportIds = new Set(
      users.filter((u) => (field === 'managerId' ? u.managerId : u.leaderId) === targetUser.id).map((u) => u.id),
    );
    const selectedSet = new Set(memberIds);

    const toAssign = memberIds.filter((id) => !currentReportIds.has(id));
    const toUnassign = Array.from(currentReportIds).filter((id) => !selectedSet.has(id));

    await Promise.all([
      ...toAssign.map((id) => updateUser(id, { [field]: targetUser.id })),
      ...toUnassign.map((id) => updateUser(id, { [field]: null })),
    ]);
    load();
  }

  // --- Bulk Selection ---
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === visibleUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleUsers.map((u) => u.id)));
    }
  };

  const handleSelectPreset = (preset: SelectionPreset) => {
    switch (preset) {
      case 'all':
        setSelectedIds(new Set(visibleUsers.map((u) => u.id)));
        break;
      case 'none':
        setSelectedIds(new Set());
        break;
      case 'read':
        setSelectedIds(new Set(visibleUsers.filter((u) => u.isActive).map((u) => u.id)));
        break;
      case 'unread':
        setSelectedIds(new Set(visibleUsers.filter((u) => !u.isActive).map((u) => u.id)));
        break;
      default:
        setSelectedIds(new Set(visibleUsers.map((u) => u.id)));
        break;
    }
  };

  const handleBulkDeactivate = async () => {
    const ids = Array.from(selectedIds).filter((id) => id !== currentUser?.id);
    if (ids.length === 0) return;
    setSelectedIds(new Set());
    await Promise.allSettled(ids.map((id) => deactivateUser(id)));
    load();

    setSnackbar({
      id: String(Date.now()),
      message: `${ids.length} accounts deactivated.`,
      onUndo: async () => {
        await Promise.allSettled(ids.map((id) => updateUser(id, { isActive: true })));
        load();
      },
    });
  };

  const handleBulkReactivate = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    setSelectedIds(new Set());
    await Promise.allSettled(ids.map((id) => updateUser(id, { isActive: true })));
    load();

    setSnackbar({
      id: String(Date.now()),
      message: `${ids.length} accounts reactivated.`,
      onUndo: async () => {
        await Promise.allSettled(ids.map((id) => deactivateUser(id)));
        load();
      },
    });
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds).filter((id) => id !== currentUser?.id);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} user accounts? This cannot be undone.`)) {
      return;
    }
    setSelectedIds(new Set());
    await Promise.allSettled(ids.map((id) => deleteUserAccount(id)));
    load();

    setSnackbar({
      id: String(Date.now()),
      message: `${ids.length} accounts deleted.`,
    });
  };

  return (
    <DashboardLayout title="User Management">
      <div className="mx-auto max-w-5xl animate-slide-up">
        {/* Top Utility Bar */}
        <InquiryBulkActionBar
          totalVisible={visibleUsers.length}
          selectedCount={selectedIds.size}
          onToggleSelectAll={handleToggleSelectAll}
          onSelectPreset={handleSelectPreset}
          onClearSelection={() => setSelectedIds(new Set())}
          onRefresh={load}
          isRefreshing={isLoading}
          onMarkAsRead={handleBulkReactivate}
          onMarkAsUnread={handleBulkDeactivate}
          onDelete={currentUser?.role === 'admin' ? handleBulkDelete : undefined}
          deleteActionLabel="Delete Accounts"
          canDelete={currentUser?.role === 'admin'}
        >
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-700 active:scale-95"
          >
            + Create Account
          </button>
        </InquiryBulkActionBar>

        <div className="mb-4">
          <SearchInput value={q} onChange={setQ} placeholder="Search name or email…" />
        </div>

        <div className="mb-4 flex flex-wrap gap-1.5">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setRoleFilter(f.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                roleFilter === f.value
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:bg-rose-950/30 dark:text-rose-400">{error}</div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-400 dark:border-white/10 dark:bg-slate-900">
            Loading accounts…
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-xs dark:border-white/10 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-white/5 dark:bg-slate-800/60 dark:text-slate-400">
                  <th className="w-12 px-4 py-3 text-center">
                    <span className="sr-only">Select</span>
                  </th>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Last Login</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleUsers.map((u) => {
                  const isSelected = selectedIds.has(u.id);
                  return (
                    <tr
                      key={u.id}
                      className={`border-b border-slate-50 last:border-0 transition-colors ${
                        isSelected ? 'bg-brand-50/50 dark:bg-brand-950/30' : 'hover:bg-slate-50/60 dark:border-white/5 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <td className="w-12 px-4 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(u.id)}
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500/20 dark:border-white/20 dark:bg-slate-800 cursor-pointer"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => setDetailUser(u)}
                          className="text-left font-medium text-slate-900 hover:text-brand-600 hover:underline dark:text-white dark:hover:text-brand-400"
                        >
                          {u.name}
                        </button>
                        <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <RoleBadge role={u.role} />
                      </td>
                      <td className="px-5 py-4 font-mono-tabular text-xs text-slate-500 dark:text-slate-400">
                        {formatDateTime(u.lastLoginAt)}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`text-xs font-semibold ${
                            u.isActive
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          {u.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {(u.role === 'manager' || u.role === 'leader') && (
                          <button
                            type="button"
                            onClick={() => setAssignTarget(u)}
                            className="mr-3 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                          >
                            {u.role === 'manager' ? 'Assign Leaders' : 'Assign Marketing'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="mr-3 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(u)}
                          className="text-sm font-medium text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
                        >
                          {u.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <UserFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        editingUser={editingUser}
        managers={managers}
        leaders={leaders}
        onDelete={
          editingUser && editingUser.id !== currentUser?.id
            ? () => handleDeleteAccount(editingUser)
            : undefined
        }
      />

      <UserDetailModal
        open={detailUser !== null}
        onClose={() => setDetailUser(null)}
        user={detailUser}
        allUsers={users}
        stats={detailUser ? findUserStats(inquiryStats, detailUser.id) : EMPTY_STATS}
        onEdit={detailUser ? () => openEdit(detailUser) : undefined}
        onToggleActive={detailUser ? () => handleToggleActive(detailUser) : undefined}
        onAssign={
          detailUser && (detailUser.role === 'manager' || detailUser.role === 'leader')
            ? () => setAssignTarget(detailUser)
            : undefined
        }
      />

      <AssignMembersModal
        open={assignTarget !== null}
        onClose={() => setAssignTarget(null)}
        targetUser={assignTarget}
        allUsers={users}
        onConfirm={(memberIds) => (assignTarget ? handleAssignConfirm(assignTarget, memberIds) : Promise.resolve())}
      />

      {/* Floating Undo Snackbar */}
      <UndoSnackbar snackbar={snackbar} onDismiss={() => setSnackbar(null)} />
    </DashboardLayout>
  );
}
