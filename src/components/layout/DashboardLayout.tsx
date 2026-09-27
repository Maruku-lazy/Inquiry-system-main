import { useState, type ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function DashboardLayout({ title, children }: { title: string; children: ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('inquireos_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('inquireos_sidebar_collapsed', String(next));
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-x-hidden bg-surface transition-colors duration-200">
      {/* Mobile backdrop overlay with smooth fade */}
      <div
        className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
          mobileNavOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar (drawer on mobile, rail on desktop with collapse support) */}
      <Sidebar
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        collapsed={collapsed}
        onToggleCollapse={toggleCollapse}
      />

      {/* Main viewport — scales and expands smoothly when sidebar collapses/expands */}
      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden transition-all duration-300 ease-in-out">
        <Topbar title={title} onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
