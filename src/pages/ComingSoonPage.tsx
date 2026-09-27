import { DashboardLayout } from '../components/layout/DashboardLayout';

interface ComingSoonPageProps {
  title: string;
  description: string;
}

// Placeholder for Phase 2 sections that are on the sidebar but not yet
// built. Swap this out for the real page component once implemented —
// nothing else needs to change since the route/nav wiring stays the same.
export function ComingSoonPage({ title, description }: ComingSoonPageProps) {
  return (
    <DashboardLayout title={title}>
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-24 text-center">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
        <span className="mt-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand-700">
          Coming soon
        </span>
      </div>
    </DashboardLayout>
  );
}
