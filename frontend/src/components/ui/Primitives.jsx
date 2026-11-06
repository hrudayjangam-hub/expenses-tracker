import { motion, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useElementInView } from '../../hooks/useScrolled';

export function Spinner({ className = '' }) {
  return <Loader2 className={`h-5 w-5 animate-spin ${className}`} />;
}

export function FullSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-ink-500 dark:text-ink-400">
      <Spinner className="h-7 w-7 text-emerald-500" />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}

export function Logo({ className = 'h-9 w-9' }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-xl bg-ink-950 dark:bg-emerald-500 ${className}`}>
      <svg viewBox="0 0 32 32" fill="none" className="h-5 w-5">
        <path
          d="M7 21.5L12.5 12.5L17 17.5L24.5 8"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-emerald-400 dark:text-ink-950"
        />
        <circle cx="24.5" cy="8" r="2.6" className="fill-emerald-400 dark:fill-ink-950" />
      </svg>
    </span>
  );
}

const BADGE_TONES = {
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-600/15 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-400/20',
  rose: 'bg-rose-50 text-rose-700 ring-rose-600/15 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-400/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/15 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-400/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/15 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-400/20',
  ink: 'bg-ink-100 text-ink-600 ring-ink-500/15 dark:bg-ink-800 dark:text-ink-300 dark:ring-ink-400/20',
};

export function Badge({ children, tone = 'ink', className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${BADGE_TONES[tone] || BADGE_TONES.ink} ${className}`}
    >
      {children}
    </span>
  );
}

const BAR_COLORS = {
  ok: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-orange-500',
  over: 'bg-rose-500',
};

export function ProgressBar({ percent = 0, status = 'ok', className = '' }) {
  const scale = Math.min(1, Math.max(0, percent) / 100);
  const [ref, inView] = useElementInView({ threshold: 0.4 });

  return (
    <div ref={ref} className={`h-2 w-full overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800 ${className}`}>
      <motion.div
        className={`h-full w-full origin-left rounded-full ${BAR_COLORS[status] || BAR_COLORS.ok}`}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: inView ? scale : 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 px-6 py-12 text-center dark:border-ink-700 ${className}`}>
      {Icon ? (
        <span className="mb-1 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <h3 className="text-sm font-bold text-ink-900 dark:text-white">{title}</h3>
      {description ? (
        <p className="max-w-sm text-sm text-ink-500 dark:text-ink-400">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function SectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`mb-4 flex flex-wrap items-start justify-between gap-3 ${className}`}>
      <div>
        <h2 className="section-title">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Pagination({ page, totalPages, total, onPage, label = 'entries' }) {
  if (!totalPages || totalPages <= 1) {
    return (
      <p className="text-xs text-ink-500 dark:text-ink-400">
        {total} {label}
      </p>
    );
  }
  const numbers = [];
  const start = Math.max(1, Math.min(page - 2, totalPages - 4));
  const end = Math.min(totalPages, start + 4);
  for (let i = start; i <= end; i += 1) numbers.push(i);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs text-ink-500 dark:text-ink-400">
        Page {page} of {totalPages} · {total} {label}
      </p>
      <div className="flex items-center gap-1.5">
        <button className="btn-ghost !px-3 !py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          Prev
        </button>
        {numbers.map((n) => (
          <button
            key={n}
            onClick={() => onPage(n)}
            className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold transition ${
              n === page
                ? 'bg-ink-900 text-white dark:bg-emerald-500 dark:text-ink-950'
                : 'text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800'
            }`}
          >
            {n}
          </button>
        ))}
        <button className="btn-ghost !px-3 !py-1.5" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
