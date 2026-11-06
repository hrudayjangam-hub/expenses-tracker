import { Spinner, EmptyState } from './ui/Primitives';
import Reveal from './motion/Reveal';

export default function ChartCard({
  title,
  subtitle,
  action,
  loading,
  error,
  empty,
  onRetry,
  children,
  className = '',
  bodyClassName = 'h-72',
}) {
  return (
    <section className={`card flex flex-col p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]" />
            {title}
          </h2>
          {subtitle ? <p className="mt-1 pl-3.5 text-xs text-ink-400 dark:text-ink-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>

      <div className={`relative flex-1 ${bodyClassName}`}>
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner className="h-6 w-6 text-emerald-500" />
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm font-medium text-rose-500">{error}</p>
            {onRetry ? (
              <button type="button" className="btn-secondary !py-2" onClick={onRetry}>
                Retry
              </button>
            ) : null}
          </div>
        ) : empty ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <EmptyState {...empty} className="w-full border-0 py-6" />
          </div>
        ) : (
          <Reveal className="h-full w-full" y={14} duration={0.55} amount={0.1}>
            {children}
          </Reveal>
        )}
      </div>
    </section>
  );
}
