import { Link } from 'react-router-dom';
import { BarChart3, PieChart, ShieldCheck, Wallet } from 'lucide-react';
import { Logo } from './ui/Primitives';

const FEATURES = [
  { icon: Wallet, title: 'Track every rupee', text: 'Record income and expenses with categories, payment methods and notes.' },
  { icon: BarChart3, title: 'Budgets that warn you', text: 'Category budgets with 75%, 90% and 100% utilisation alerts.' },
  { icon: PieChart, title: 'Real analytics', text: 'Daily, weekly, monthly and yearly insights computed from your data.' },
  { icon: ShieldCheck, title: 'Private by design', text: 'Every account only ever sees its own financial records.' },
];

export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-ink-50 dark:bg-ink-950 lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-ink-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, rgba(16,185,129,0.20), transparent 45%), radial-gradient(circle at 80% 70%, rgba(71,85,138,0.40), transparent 50%)',
          }}
        />
        <span className="et-blob pointer-events-none absolute -left-24 top-1/3 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <span className="et-blob et-blob-delayed pointer-events-none absolute -right-20 bottom-1/4 h-80 w-80 rounded-full bg-sky-500/15 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(circle at 30% 40%, black, transparent 75%)',
          }}
        />
        <div className="relative">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-10 w-10" />
            <div>
              <p className="text-base font-extrabold tracking-tight text-white">Expenses Tracker</p>
              <p className="text-xs font-medium text-ink-400">Personal finance, done properly</p>
            </div>
          </Link>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight tracking-tight text-white">
            Know exactly where your <span className="text-gradient">money goes</span>.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-ink-300">
            A clean, fast dashboard for income, expenses, budgets and reports — built for students,
            professionals and families.
          </p>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/25 to-sky-500/20 text-emerald-300 ring-1 ring-white/10">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs leading-relaxed text-ink-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-ink-500">Batch 21CS29 · Full-stack project</p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen flex-col justify-center px-5 py-10 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <Logo />
            <div>
              <p className="text-sm font-extrabold text-ink-900 dark:text-white">Expenses Tracker</p>
              <p className="text-xs text-ink-400">Batch 21CS29</p>
            </div>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">{title}</h1>
          <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>

          <div className="mt-7">{children}</div>

          {footer ? <div className="mt-6 text-center text-sm text-ink-500 dark:text-ink-400">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
