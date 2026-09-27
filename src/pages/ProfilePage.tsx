import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { ROLE_LABELS } from '../types';
import { formatDate } from '../lib/format';

export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null;

  const initials = user.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('');

  return (
    <DashboardLayout title="Profile">
      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
              <span className="mt-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>

          <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</dt>
              <dd className="mt-1 text-sm text-slate-800">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Account status
              </dt>
              <dd className="mt-1 text-sm text-slate-800">
                {user.isActive ? 'Active' : 'Deactivated'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Member since
              </dt>
              <dd className="mt-1 text-sm text-slate-800">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>

          <p className="mt-8 border-t border-slate-100 pt-6 text-xs text-slate-400">
            Need a password reset or a change to your role? Contact your System Administrator —
            self-service account changes aren't available in this phase.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
