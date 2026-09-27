import { useState, type FormEvent } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ApiError } from '../api/client';

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!isLoading && isAuthenticated) {
    const redirectTo = (location.state as { from?: string })?.from ?? '/dashboard';
    return <Navigate to={redirectTo} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to reach the server. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left: brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-700 p-12 text-white lg:flex">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-500/40 blur-3xl" />
        <div className="absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-brand-900/50 blur-3xl" />

        <div className="relative flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-white/15">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <rect x="4" y="4" width="7" height="7" rx="1.5" fill="white" />
              <rect x="13" y="4" width="7" height="7" rx="1.5" fill="white" opacity="0.55" />
              <rect x="4" y="13" width="7" height="7" rx="1.5" fill="white" opacity="0.55" />
              <rect x="13" y="13" width="7" height="7" rx="1.5" fill="white" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">DEMO PALANG NGA</span>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-3xl font-bold leading-tight">
            nuhuh
          </h1>
          <p className="mt-4 max-w-sm text-sm text-brand-100">
            sssss
          </p>
        </div>

        <p className="relative font-mono-tabular text-xs text-brand-200">
          Customer Inquiry Tracking System · Phase 2
        </p>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="flex items-center gap-2.5">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-600 text-white">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                  <rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor" />
                  <rect x="13" y="4" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.55" />
                  <rect x="4" y="13" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.55" />
                  <rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-900">InquireOS</span>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
          <p className="mt-1 text-sm text-slate-500">Sign in with your company account.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                required
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@toyotaalbay.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input
                required
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </div>

            {error && (
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-xs text-slate-400">
            Accounts are created by your System Administrator. Contact them if you need access or
            a password reset.
          </p>
        </div>
      </div>
    </div>
  );
}
