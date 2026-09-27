import { useEffect, useMemo, useState } from 'react';
import type { Role, User } from '../../types';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import { backdropClickHandler } from './modalBackdrop';

interface AssignMembersModalProps {
  open: boolean;
  onClose: () => void;
  targetUser: User | null; // the leader or manager receiving assignments
  allUsers: User[];
  onConfirm: (selectedUserIds: string[]) => Promise<void>;
}

export function AssignMembersModal({
  open,
  onClose,
  targetUser,
  allUsers,
  onConfirm,
}: AssignMembersModalProps) {
  const candidateRole: Role | null = targetUser
    ? targetUser.role === 'manager'
      ? 'leader'
      : targetUser.role === 'leader'
        ? 'sales'
        : null
    : null;

  const parentField: 'managerId' | 'leaderId' = targetUser?.role === 'manager' ? 'managerId' : 'leaderId';

  // Unassigned candidates first, then everyone else already assigned
  // elsewhere (or to this same target) — matches the requested ordering.
  const candidates = useMemo(() => {
    if (!targetUser || !candidateRole) return [];
    const pool = allUsers.filter((u) => u.role === candidateRole);
    const unassigned = pool.filter((u) => !u[parentField]);
    const assigned = pool.filter((u) => u[parentField]);
    return [...unassigned, ...assigned];
  }, [allUsers, candidateRole, parentField, targetUser]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!targetUser) return;
    const currentReports = allUsers.filter((u) => u[parentField] === targetUser.id);
    setSelected(new Set(currentReports.map((u) => u.id)));
    setError(null);
  }, [allUsers, open, parentField, targetUser]);

  useEscapeKey(onClose, open);
  if (!open || !targetUser || !candidateRole) return null;

  const allSelected = candidates.length > 0 && selected.size === candidates.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)));
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      await onConfirm(Array.from(selected));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const noun = candidateRole === 'sales' ? 'Marketing Agents' : 'Leaders';

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 px-4"
      onClick={backdropClickHandler(onClose)}
    >
      <div className="flex max-h-[85vh] w-full max-w-md flex-col rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Assign {noun} to {targetUser.name}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <label className="mt-4 flex items-center gap-2 border-b border-slate-100 pb-3 text-sm font-medium text-slate-700">
          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="h-4 w-4 rounded accent-brand-600" />
          Select all ({candidates.length})
        </label>

        <div className="mt-2 flex-1 overflow-y-auto">
          {candidates.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              No {noun.toLowerCase()} exist yet to assign.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {candidates.map((c) => {
                const isUnassigned = !c[parentField];
                const isCurrentlyHere = c[parentField] === targetUser.id;
                return (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-1 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggle(c.id)}
                        className="h-4 w-4 rounded accent-brand-600"
                      />
                      <span className="flex-1 text-sm font-medium text-slate-800">{c.name}</span>
                      {isUnassigned && (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          Unassigned
                        </span>
                      )}
                      {!isUnassigned && isCurrentlyHere && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                          Currently here
                        </span>
                      )}
                      {!isUnassigned && !isCurrentlyHere && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          Assigned elsewhere
                        </span>
                      )}
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
        )}

        <div className="mt-4 flex justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? 'Saving…' : `Save assignments (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
