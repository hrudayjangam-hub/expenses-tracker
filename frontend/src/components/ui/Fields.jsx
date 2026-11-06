import { forwardRef } from 'react';

export function Field({ label, error, hint, children, className = '' }) {
  return (
    <div className={className}>
      {label ? <label className="label">{label}</label> : null}
      {children}
      {hint && !error ? <p className="mt-1.5 text-xs text-ink-400 dark:text-ink-500">{hint}</p> : null}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ className = '', invalid = false, ...props }, ref) {
  return <input ref={ref} className={`input ${invalid ? '!border-rose-400 focus:border-rose-500 focus:ring-rose-500/15' : ''} ${className}`} {...props} />;
});

export const Select = forwardRef(function Select({ className = '', invalid = false, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={`input appearance-none pr-9 ${invalid ? '!border-rose-400' : ''} ${className}`}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
          clipRule="evenodd"
        />
      </svg>
    </div>
  );
});

export const Textarea = forwardRef(function Textarea({ className = '', invalid = false, ...props }, ref) {
  return <textarea ref={ref} className={`input min-h-[84px] resize-y ${invalid ? '!border-rose-400' : ''} ${className}`} {...props} />;
});

export function FormError({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
      {message}
    </div>
  );
}
