import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Tags,
  Wallet,
  X,
  Sun,
  Moon,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Logo } from '../components/ui/Primitives';
import useScrolled from '../hooks/useScrolled';

const NAV = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/transactions', label: 'Transactions', icon: Receipt },
  { to: '/budgets', label: 'Budgets', icon: Wallet },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/categories', label: 'Categories', icon: Tags },
  { to: '/settings', label: 'Settings', icon: Settings },
];

const TITLES = [
  { path: '/', title: 'Dashboard' },
  { path: '/transactions', title: 'Transactions' },
  { path: '/budgets', title: 'Budgets' },
  { path: '/analytics', title: 'Analytics' },
  { path: '/reports', title: 'Reports' },
  { path: '/categories', title: 'Categories' },
  { path: '/settings', title: 'Settings' },
];

export default function DashboardLayout({ onAddTransaction }) {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('et_sidebar') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const scrolled = useScrolled(6);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    localStorage.setItem('et_sidebar', collapsed ? '1' : '0');
  }, [collapsed]);

  const pageTitle = TITLES.find((t) => t.path === location.pathname)?.title || 'Expenses Tracker';

  const initials = (user?.name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const navItem = ({ isActive }) =>
    `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-150 ${
      isActive
        ? 'nav-indicator bg-emerald-500/10 text-emerald-700 dark:bg-emerald-500/12 dark:text-emerald-400'
        : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white'
    }`;

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className={`flex items-center gap-3 px-4 py-5 ${collapsed && !mobileOpen ? 'justify-center' : ''}`}>
        <Logo className="h-9 w-9 shrink-0" />
        {(!collapsed || mobileOpen) && (
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight text-ink-900 dark:text-white">
              Expenses Tracker
            </p>
            <p className="truncate text-[11px] font-medium text-ink-400">Batch 21CS29</p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2 scrollbar-thin">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={navItem} title={collapsed && !mobileOpen ? label : undefined}>
            <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 group-active:scale-95" />
            {(!collapsed || mobileOpen) && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-ink-100 p-3 dark:border-ink-800">
        <div className={`mb-2 flex items-center gap-3 rounded-xl bg-ink-50 px-3 py-2.5 dark:bg-ink-800 ${collapsed && !mobileOpen ? 'justify-center px-2' : ''}`}>
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-xs font-bold text-white dark:bg-emerald-500 dark:text-ink-950">
            {initials}
          </span>
          {(!collapsed || mobileOpen) && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{user?.name}</p>
              <p className="truncate text-xs text-ink-400">{user?.email}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-ink-600 transition hover:bg-rose-50 hover:text-rose-600 dark:text-ink-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 ${
            collapsed && !mobileOpen ? 'justify-center' : ''
          }`}
          title="Log out"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {(!collapsed || mobileOpen) && <span>Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden border-r border-ink-100 bg-white transition-all duration-200 dark:border-ink-800 dark:bg-ink-900 lg:block ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {SidebarContent}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute -right-3 top-20 inline-flex h-6 w-6 items-center justify-center rounded-full border border-ink-200 bg-white text-ink-500 shadow-sm transition hover:text-emerald-600 dark:border-ink-700 dark:bg-ink-800 dark:text-ink-300"
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade-in bg-white shadow-pop dark:bg-ink-900">
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 rounded-lg p-1.5 text-ink-400 hover:bg-ink-100 dark:hover:bg-ink-800"
            >
              <X className="h-5 w-5" />
            </button>
            {SidebarContent}
          </div>
        </div>
      )}

      <div className={`transition-all duration-200 ${collapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        <header
          className={`sticky top-0 z-30 border-b transition-all duration-300 ${
            scrolled
              ? 'border-ink-100 bg-white/92 shadow-[0_10px_36px_-24px_rgba(10,16,32,0.55)] backdrop-blur-xl dark:border-ink-800 dark:bg-ink-950/92'
              : 'border-ink-100 bg-white/60 backdrop-blur-md dark:border-ink-800 dark:bg-ink-950/60'
          }`}
        >
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-emerald-500/45 to-transparent" />
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="rounded-xl p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-base font-bold tracking-tight text-ink-900 sm:text-lg dark:text-white">
                {pageTitle}
              </h1>
              <p className="hidden truncate text-xs text-ink-400 sm:block">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="rounded-xl p-2.5 text-ink-600 ring-1 ring-ink-200 transition hover:bg-ink-50 dark:text-ink-300 dark:ring-ink-700 dark:hover:bg-ink-800"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button onClick={onAddTransaction} className="btn-primary !py-2 hidden sm:inline-flex">
              <Plus className="h-4 w-4" /> Add
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-xl p-1.5 ring-1 ring-ink-200 transition hover:bg-ink-50 dark:ring-ink-700 dark:hover:bg-ink-800"
                aria-label="Account menu"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-ink-900 text-[11px] font-bold text-white dark:bg-emerald-500 dark:text-ink-950">
                  {initials}
                </span>
                <ChevronRight className="hidden h-4 w-4 rotate-90 text-ink-400 sm:block" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 animate-fade-in overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-pop dark:border-ink-800 dark:bg-ink-900">
                    <div className="border-b border-ink-100 px-4 py-3 dark:border-ink-800">
                      <p className="truncate text-sm font-semibold text-ink-900 dark:text-white">{user?.name}</p>
                      <p className="truncate text-xs text-ink-400">{user?.email}</p>
                    </div>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-3 text-sm font-medium text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
                    >
                      <Settings className="h-4 w-4" /> Profile & settings
                    </Link>
                    <button
                      onClick={() => {
                        logout();
                        navigate('/login');
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-500/10"
                    >
                      <LogOut className="h-4 w-4" /> Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait" initial={false}>
          <motion.main
            key={location.pathname}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.22, ease: 'easeOut' }}
            className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6"
          >
            <Outlet />
          </motion.main>
        </AnimatePresence>

        <button
          onClick={onAddTransaction}
          aria-label="Add transaction"
          className="fixed bottom-5 right-5 z-30 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-pop transition active:scale-95 sm:hidden"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
