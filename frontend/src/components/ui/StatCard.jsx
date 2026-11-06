import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

const TONES = {
  emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400',
  rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
  sky: 'bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-400',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400',
  ink: 'bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300',
};

export default function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'ink',
  sub,
  delta,
  variant = 'default',
  className = '',
}) {
  const hero = variant === 'hero';

  if (hero) {
    return (
      <div className={`card-hover relative overflow-hidden rounded-2xl bg-ink-950 p-5 text-white shadow-pop ${className}`}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(30rem 16rem at 110% -20%, rgba(16,185,129,0.45), transparent 60%), radial-gradient(24rem 14rem at -20% 120%, rgba(59,130,246,0.35), transparent 60%)',
          }}
        />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300/80">{label}</p>
            <p className="mt-2.5 truncate text-3xl font-extrabold tracking-tight tabular">{value}</p>
          </div>
          {Icon ? (
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-emerald-300 ring-1 ring-white/15">
              <Icon className="h-5 w-5" />
            </span>
          ) : null}
        </div>
        {sub ? (
          <p className="relative mt-3 truncate text-xs font-medium text-ink-300">{sub}</p>
        ) : null}
        <span className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-emerald-400/10 blur-2xl" />
      </div>
    );
  }

  return (
    <div className={`card-hover card group relative overflow-hidden p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-[0.12em] text-ink-400 dark:text-ink-500">{label}</p>
          <p className="mt-2 truncate text-2xl font-extrabold tracking-tight text-ink-900 tabular dark:text-white">{value}</p>
        </div>
        {Icon ? (
          <span
            className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${TONES[tone] || TONES.ink}`}
          >
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      {(sub || delta !== undefined) && (
        <div className="mt-3 flex items-center gap-2 text-xs font-medium text-ink-400 dark:text-ink-500">
          {delta !== undefined && delta !== null ? (
            <span
              className={`inline-flex items-center gap-0.5 font-semibold ${
                delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {delta >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
              {Math.abs(delta)}%
            </span>
          ) : null}
          {sub ? <span className="truncate">{sub}</span> : null}
        </div>
      )}
      <span className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-emerald-400 to-sky-400 transition-transform duration-300 group-hover:scale-x-100" />
    </div>
  );
}
