import { useEffect, useState, type FormEvent } from 'react';
import type { Role, User } from '../../types';
import { ROLE_LABELS } from '../../types';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { backdropClickHandler } from './modalBackdrop';

interface UserFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    email: string;
    password?: string;
    role: Role;
    managerId?: string | null;
    leaderId?: string | null;
  }) => Promise<void>;
  editingUser?: User | null;
  managers: User[];
  leaders: User[];
  // Present only when editing — omit entirely to hide the Delete Account
  // action (e.g. you can't delete your own account).
  onDelete?: () => Promise<void>;
}

const ROLE_ORDER: Role[] = ['admin', 'manager', 'leader', 'sales'];

export function UserFormModal({
  open,
  onClose,
  onSubmit,
  editingUser,
  managers,
  leaders,
  onDelete,
}: UserFormModalProps) {
  const isEditing = Boolean(editingUser);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('sales');
  const [managerId, setManagerId] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (editingUser) {
      setName(editingUser.name);
      setEmail(editingUser.email);
      setRole(editingUser.role);
      setManagerId(editingUser.managerId ?? '');
      setLeaderId(editingUser.leaderId ?? '');
    } else {
      setName('');
      setEmail('');
      setRole('sales');
      setManagerId('');
      setLeaderId('');
    }
    setPassword('');
    setError(null);
  }, [editingUser, open]);

  useEscapeKey(onClose, open);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({
        name,
        email,
        ...(password && { password }),
        role,
        managerId: role === 'leader' ? managerId || null : null,
        leaderId: role === 'sales' ? leaderId || null : null,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    const confirmed = window.confirm(
      `Delete ${editingUser?.name}'s account? Their existing inquiries and activity history stay in the database and remain attributed to them — a supervisor can reassign anything still pointing at this account. This cannot be undone from here.`,
    );
    if (!confirmed) return;
    setError(null);
    setDeleting(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete this account. Please try again.');
    } finally {
      setDeleting(false);
    }
  }

  const inputClass =
    'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-white/15 dark:bg-slate-800 dark:text-white';
  const labelClass = 'mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 backdrop-blur-xs px-4 animate-fade-in"
      onClick={backdropClickHandler(onClose)}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 sm:p-6 shadow-2xl animate-modal-enter dark:bg-slate-900 dark:border dark:border-white/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            {isEditing ? 'Edit Account' : 'Create Account'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 active:scale-95 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className={labelClass}>Full name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>
              {isEditing ? 'New password (optional)' : 'Temporary password'}
            </label>
            <input
              required={!isEditing}
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isEditing ? 'Leave blank to keep current password' : 'At least 8 characters'}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className={inputClass}
            >
              {ROLE_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          {role === 'leader' && (
            <div>
              <label className={labelClass}>Reports to (Manager)</label>
              <select
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                className={inputClass}
              >
                <option value="">— Select a manager —</option>
                {managers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {role === 'sales' && (
            <div>
              <label className={labelClass}>Reports to (Leader)</label>
              <select
                value={leaderId}
                onChange={(e) => setLeaderId(e.target.value)}
                className={inputClass}
              >
                <option value="">— Select a leader —</option>
                {leaders.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:bg-rose-950/40 dark:text-rose-300">{error}</p>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            {isEditing && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="text-sm font-medium text-rose-500 hover:text-rose-600 disabled:opacity-60"
              >
                {deleting ? 'Deleting…' : 'Delete Account'}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
              >
                {submitting ? 'Saving…' : isEditing ? 'Save changes' : 'Create account'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
