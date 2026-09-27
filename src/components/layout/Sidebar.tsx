import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useUnseen } from '../../hooks/useUnseen';
import { ROLE_LABELS } from '../../types';

const linkBase =
  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150';
const linkInactive = 'text-slate-300 hover:bg-white/10 hover:text-white';
const linkActive = 'bg-[#24344d] text-white font-semibold shadow-xs ring-1 ring-white/10';

const subLinkBase = 'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors';
const subLinkInactive = 'text-slate-400 hover:bg-white/10 hover:text-white';
const subLinkActive = 'bg-white/15 text-white font-semibold';

function NavIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px] shrink-0">
      <path d={path} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICONS = {
  home: 'M4 11.5 12 4l8 7.5M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9',
  inquiries: 'M6 4h9l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z M14 4v5h5 M9 13h6 M9 16.5h6',
  users: 'M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M3 20c.7-3.2 3-5 5.5-5s4.8 1.8 5.5 5 M17 11a3 3 0 1 0 0-6 M15.5 20c.4-2.4 1.5-3.9 3.2-4.6 M21 20c-.2-1.4-.7-2.6-1.4-3.5',
  profile: 'M12 12.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Z M4.5 20.5c1-4 4-6 7.5-6s6.5 2 7.5 6',
  logs: 'M8 4h8l4 4v12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z M16 4v4h4 M9 12h6 M9 15.5h6 M9 8.5h2',
  organization: 'M4 20v-6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v6 M8 20v-3a2 2 0 0 1 4 0v3 M12 12V4 M9 7h6',
  analytics: 'M4 20V10 M10 20V4 M16 20v-7 M4 20h16',
  tasks: 'M9 5h6a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z M9 5V3.5A1.5 1.5 0 0 1 10.5 2h3A1.5 1.5 0 0 1 15 3.5V5 M9 12.5l1.8 1.8L15 10.5',
  contacts: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M4.5 20.5c1-4.2 4.2-6.5 7.5-6.5s6.5 2.3 7.5 6.5',
};

const SUBLINKS_ICONS = {
  // Inquiries
  active: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  completed: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  deleted: 'M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0',
  // Logs
  activity: 'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z',
  inquiryLogs: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
  // Users
  users: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z',
  userInfo: 'M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z',
  // Organization
  teamChart: 'M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.999-3.199a5.971 5.971 0 0 1-.94-3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
  teamMgmt: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
};

interface NavGroupLink {
  to: string;
  label: string;
  icon?: string;
  end?: boolean;
  dot?: boolean;
}

function UnseenDot() {
  return <span className="ml-auto h-2 w-2 shrink-0 rounded-full bg-rose-500" aria-label="Unseen items" />;
}

interface NavGroupProps {
  icon: string;
  label: string;
  compactLabel?: string;
  links: NavGroupLink[];
  collapsed?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  onHover?: () => void;
  onHoverLeave?: () => void;
  onNavigate?: () => void;
}

function NavGroup({
  icon,
  label,
  compactLabel,
  links,
  collapsed,
  isOpen = false,
  onToggle,
  onHover,
  onHoverLeave,
  onNavigate,
}: NavGroupProps) {
  const location = useLocation();
  const isGroupActive = links.some((l) => location.pathname.startsWith(l.to));
  const hasGroupUnseen = links.some((l) => l.dot);

  if (collapsed) {
    return (
      <div
        className="group relative"
        onMouseEnter={onHover}
        onMouseLeave={onHoverLeave}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          className={`relative flex w-full flex-col items-center justify-center rounded-xl p-2 cursor-pointer transition-all duration-150 focus:outline-hidden ${
            isGroupActive || isOpen
              ? 'bg-[#24344d] text-white font-semibold ring-1 ring-white/10 shadow-xs'
              : 'text-slate-300 hover:bg-white/10 hover:text-white'
          }`}
          title={label}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <NavIcon path={icon} />
          {hasGroupUnseen && (
            <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#162032]" />
          )}
          <span className="mt-1 text-[10px] font-medium tracking-tight truncate max-w-full leading-tight">
            {compactLabel ?? label}
          </span>
        </button>

        {/* Flyout Submenu Panel (Supports desktop hover and touch/click tap) */}
        <div
          className={`absolute left-full top-0 pl-2.5 z-50 transition-all duration-150 ${
            isOpen
              ? 'opacity-100 scale-100 pointer-events-auto flex'
              : 'opacity-0 scale-95 pointer-events-none hidden group-hover:flex group-hover:pointer-events-auto group-hover:opacity-100 group-hover:scale-100'
          }`}
        >
          {/* Invisible hit bridge spanning the gap so mouse movement never loses hover */}
          <div className="absolute -left-3 top-0 bottom-0 w-6 pointer-events-auto" />

          <div
            onClick={(e) => e.stopPropagation()}
            className="flex flex-col w-56 rounded-2xl bg-[#162032] border border-slate-700/80 p-2 shadow-2xl backdrop-blur-md"
          >
            {/* Header matching Zoho CRM module popup style */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 mb-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                {label}
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {links.length} {links.length === 1 ? 'option' : 'options'}
              </span>
            </div>

            {/* Sublink options with icons and redirection */}
            <div className="flex flex-col gap-1">
              {links.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.end}
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigate?.();
                  }}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? 'bg-brand-600 text-white font-semibold shadow-xs'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  {link.icon && (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="h-4 w-4 shrink-0 text-slate-400"
                    >
                      <path d={link.icon} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                  <span className="flex-1 truncate">{link.label}</span>
                  {link.dot && <UnseenDot />}
                </NavLink>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-1">
      <div className="flex items-center gap-3 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <NavIcon path={icon} />
        {label}
      </div>
      <div className="ml-[28px] flex flex-col gap-0.5 border-l border-white/10 pl-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate?.();
            }}
            className={({ isActive }) => `${subLinkBase} ${isActive ? subLinkActive : subLinkInactive}`}
          >
            {link.icon && (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 shrink-0">
                <path d={link.icon} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            <span>{link.label}</span>
            {link.dot && <UnseenDot />}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

interface SidebarProps {
  mobileOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ mobileOpen = false, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const { user } = useAuth();
  const { hasUnseen } = useUnseen();
  const location = useLocation();
  const [activeFlyout, setActiveFlyout] = useState<string | null>(null);
  const sidebarRef = useRef<HTMLElement>(null);

  // Close flyout on outside click
  useEffect(() => {
    if (!activeFlyout) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target as Node)) {
        setActiveFlyout(null);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeFlyout]);

  // Reset open flyouts when sidebar collapse state or route path changes
  useEffect(() => {
    setActiveFlyout(null);
  }, [collapsed, location.pathname]);

  if (!user) return null;

  const isAdmin = user.role === 'admin';
  const isManager = user.role === 'manager';

  const handleNavClick = () => {
    setActiveFlyout(null);
    onClose?.();
  };

  const handleToggleFlyout = (id: string) => {
    setActiveFlyout((prev) => (prev === id ? null : id));
  };

  const handleHoverFlyout = (id: string) => {
    setActiveFlyout(id);
  };

  const handleHoverLeaveFlyout = (id: string) => {
    setActiveFlyout((prev) => (prev === id ? null : prev));
  };

  return (
    <aside
      ref={sidebarRef}
      onClick={() => {
        // Global effortless background expansion when minimized
        if (collapsed) {
          onToggleCollapse?.();
        }
      }}
      className={`fixed inset-y-0 left-0 z-50 flex h-full shrink-0 flex-col bg-[#162032] border-r border-slate-800 text-slate-300 shadow-xl transition-all duration-300 ease-in-out lg:static lg:shadow-none ${
        mobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
      } ${collapsed ? 'lg:w-[76px] overflow-visible cursor-pointer' : 'lg:w-64'}`}
      title={collapsed ? 'Click anywhere on sidebar background to expand' : undefined}
    >
      {/* Header: Single centered morphing icon when collapsed, brand bar when expanded */}
      {collapsed ? (
        <div className="flex items-center justify-center py-4 border-b border-white/5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse?.();
            }}
            className="group relative flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shadow-brand-600/30 transition-all duration-200 hover:bg-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-400 active:scale-95 cursor-pointer"
            title="Expand sidebar"
            aria-label="Expand sidebar"
          >
            {/* Brand Logo (visible by default, morphs out on hover/focus) */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="h-5 w-5 transition-all duration-200 ease-out group-hover:scale-75 group-hover:opacity-0 group-focus:scale-75 group-focus:opacity-0"
            >
              <rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor" />
              <rect x="13" y="4" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.55" />
              <rect x="4" y="13" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.55" />
              <rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor" />
            </svg>

            {/* Expand Chevrons (hidden by default, smoothly morphs in on hover/focus) */}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="absolute h-5 w-5 scale-75 opacity-0 transition-all duration-200 ease-out group-hover:scale-100 group-hover:opacity-100 group-focus:scale-100 group-focus:opacity-100"
            >
              <path d="m13 17 5-5-5-5" />
              <path d="M6 17l5-5-5-5" />
            </svg>

            {/* Floating Tooltip */}
            <div className="pointer-events-none absolute left-full ml-3.5 z-50 hidden group-hover:flex items-center">
              <div className="rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 text-xs font-semibold text-white shadow-xl whitespace-nowrap">
                Expand sidebar
              </div>
            </div>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-600 text-white shadow-sm shadow-brand-600/30">
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <rect x="4" y="4" width="7" height="7" rx="1.5" fill="currentColor" />
                <rect x="13" y="4" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.55" />
                <rect x="4" y="13" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.55" />
                <rect x="13" y="13" width="7" height="7" rx="1.5" fill="currentColor" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight text-white">InquireOS</span>
          </div>

          {/* Collapse Toggle Button (desktop) */}
          {onToggleCollapse && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleCollapse();
              }}
              className="hidden lg:grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all active:scale-95"
              title="Minimize sidebar"
              aria-label="Minimize sidebar"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M9 3v18" />
                <path d="m15 9-3 3 3 3" />
              </svg>
            </button>
          )}

          {/* Close Button (mobile) */}
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white active:scale-95 lg:hidden"
              aria-label="Close navigation"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
                <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Role tag (only when expanded) */}
      {!collapsed && (
        <div className="px-5 pt-3 pb-1">
          <span className="inline-block rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-300">
            {ROLE_LABELS[user.role]}
          </span>
        </div>
      )}

      {/* Navigation List - overflow-visible when collapsed so flyouts never get clipped */}
      <nav className={`mt-2 flex flex-1 flex-col gap-1.5 ${collapsed ? 'px-2 pb-4 overflow-visible' : 'px-3 pb-4 overflow-y-auto'}`}>
        {/* Dashboard */}
        {collapsed ? (
          <div className="group relative">
            <NavLink
              to="/dashboard"
              onClick={(e) => {
                e.stopPropagation();
                handleNavClick();
              }}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all duration-150 ${
                  isActive
                    ? 'bg-[#24344d] text-white font-semibold ring-1 ring-white/10 shadow-xs'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <NavIcon path={ICONS.home} />
              <span className="mt-1 text-[10px] font-medium tracking-tight truncate max-w-full leading-tight">
                Home
              </span>
            </NavLink>
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-50 hidden group-hover:flex items-center">
              <div className="rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 text-xs font-semibold text-white shadow-xl whitespace-nowrap">
                Dashboard
              </div>
            </div>
          </div>
        ) : (
          <NavLink
            to="/dashboard"
            onClick={(e) => {
              e.stopPropagation();
              handleNavClick();
            }}
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
          >
            <NavIcon path={ICONS.home} />
            Dashboard
          </NavLink>
        )}

        {/* Analytics */}
        {collapsed ? (
          <div className="group relative">
            <NavLink
              to="/analytics"
              onClick={(e) => {
                e.stopPropagation();
                handleNavClick();
              }}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all duration-150 ${
                  isActive
                    ? 'bg-[#24344d] text-white font-semibold ring-1 ring-white/10 shadow-xs'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <NavIcon path={ICONS.analytics} />
              <span className="mt-1 text-[10px] font-medium tracking-tight truncate max-w-full leading-tight">
                Analytics
              </span>
            </NavLink>
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-50 hidden group-hover:flex items-center">
              <div className="rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 text-xs font-semibold text-white shadow-xl whitespace-nowrap">
                Analytics
              </div>
            </div>
          </div>
        ) : (
          <NavLink
            to="/analytics"
            onClick={(e) => {
              e.stopPropagation();
              handleNavClick();
            }}
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
          >
            <NavIcon path={ICONS.analytics} />
            Analytics
          </NavLink>
        )}

        {/* Logs */}
        {isAdmin && (
          <NavGroup
            icon={ICONS.logs}
            label="Logs"
            collapsed={collapsed}
            isOpen={activeFlyout === 'Logs'}
            onToggle={() => handleToggleFlyout('Logs')}
            onHover={() => handleHoverFlyout('Logs')}
            onHoverLeave={() => handleHoverLeaveFlyout('Logs')}
            onNavigate={handleNavClick}
            links={[
              { to: '/logs/activity', label: 'Activity', icon: SUBLINKS_ICONS.activity },
              { to: '/logs/inquiries', label: 'Inquiries', icon: SUBLINKS_ICONS.inquiryLogs },
            ]}
          />
        )}

        {/* Inquiries */}
        <NavGroup
          icon={ICONS.inquiries}
          label="Inquiries"
          collapsed={collapsed}
          isOpen={activeFlyout === 'Inquiries'}
          onToggle={() => handleToggleFlyout('Inquiries')}
          onHover={() => handleHoverFlyout('Inquiries')}
          onHoverLeave={() => handleHoverLeaveFlyout('Inquiries')}
          onNavigate={handleNavClick}
          links={[
            { to: '/inquiries/active', label: 'Active', icon: SUBLINKS_ICONS.active, dot: hasUnseen },
            { to: '/inquiries/completed', label: 'Completed', icon: SUBLINKS_ICONS.completed },
            { to: '/inquiries/deleted', label: 'Deleted', icon: SUBLINKS_ICONS.deleted },
          ]}
        />

        {/* Tasks */}
        {collapsed ? (
          <div className="group relative">
            <NavLink
              to="/tasks"
              onClick={(e) => {
                e.stopPropagation();
                handleNavClick();
              }}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all duration-150 ${
                  isActive
                    ? 'bg-[#24344d] text-white font-semibold ring-1 ring-white/10 shadow-xs'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <NavIcon path={ICONS.tasks} />
              {hasUnseen && (
                <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-[#162032]" />
              )}
              <span className="mt-1 text-[10px] font-medium tracking-tight truncate max-w-full leading-tight">
                Tasks
              </span>
            </NavLink>
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-50 hidden group-hover:flex items-center">
              <div className="rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 text-xs font-semibold text-white shadow-xl whitespace-nowrap">
                Tasks
              </div>
            </div>
          </div>
        ) : (
          <NavLink
            to="/tasks"
            onClick={(e) => {
              e.stopPropagation();
              handleNavClick();
            }}
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
          >
            <NavIcon path={ICONS.tasks} />
            Tasks
            {hasUnseen && <UnseenDot />}
          </NavLink>
        )}

        {/* Contacts */}
        {collapsed ? (
          <div className="group relative">
            <NavLink
              to="/contacts"
              onClick={(e) => {
                e.stopPropagation();
                handleNavClick();
              }}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all duration-150 ${
                  isActive
                    ? 'bg-[#24344d] text-white font-semibold ring-1 ring-white/10 shadow-xs'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <NavIcon path={ICONS.contacts} />
              <span className="mt-1 text-[10px] font-medium tracking-tight truncate max-w-full leading-tight">
                Contacts
              </span>
            </NavLink>
            <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3.5 z-50 hidden group-hover:flex items-center">
              <div className="rounded-lg bg-slate-900/95 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 text-xs font-semibold text-white shadow-xl whitespace-nowrap">
                Contacts
              </div>
            </div>
          </div>
        ) : (
          <NavLink
            to="/contacts"
            onClick={(e) => {
              e.stopPropagation();
              handleNavClick();
            }}
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
          >
            <NavIcon path={ICONS.contacts} />
            Contacts
          </NavLink>
        )}

        {/* User Management */}
        {isAdmin && (
          <NavGroup
            icon={ICONS.users}
            label="Users"
            collapsed={collapsed}
            isOpen={activeFlyout === 'Users'}
            onToggle={() => handleToggleFlyout('Users')}
            onHover={() => handleHoverFlyout('Users')}
            onHoverLeave={() => handleHoverLeaveFlyout('Users')}
            onNavigate={handleNavClick}
            links={[
              { to: '/users', label: 'User Management', icon: SUBLINKS_ICONS.users, end: true },
              { to: '/users/information', label: 'User Information', icon: SUBLINKS_ICONS.userInfo },
            ]}
          />
        )}

        {/* Organization */}
        <NavGroup
          icon={ICONS.organization}
          label="Organization"
          compactLabel="Org"
          collapsed={collapsed}
          isOpen={activeFlyout === 'Organization'}
          onToggle={() => handleToggleFlyout('Organization')}
          onHover={() => handleHoverFlyout('Organization')}
          onHoverLeave={() => handleHoverLeaveFlyout('Organization')}
          onNavigate={handleNavClick}
          links={[
            { to: '/organization/chart', label: 'Team Chart', icon: SUBLINKS_ICONS.teamChart },
            ...(isManager
              ? [{ to: '/organization/team-management', label: 'Team Management', icon: SUBLINKS_ICONS.teamMgmt }]
              : []),
          ]}
        />

        {/* Subtle expand hint icon at the bottom of the rail when collapsed */}
        {collapsed && (
          <div className="mt-auto pt-4 flex flex-col items-center justify-center">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Click background to expand"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <path d="m13 17 5-5-5-5" />
                <path d="M6 17l5-5-5-5" />
              </svg>
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
