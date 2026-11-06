import { useState } from 'react';
import { CalendarRange } from 'lucide-react';
import { DATE_PRESETS, resolvePreset } from '../utils/datePresets';
import { toISODate } from '../utils/format';

export default function DateRangeFilter({ preset = 'month', from = '', to = '', onChange, id = 'range' }) {
  const [customFrom, setCustomFrom] = useState(from || toISODate(new Date()));
  const [customTo, setCustomTo] = useState(to || toISODate(new Date()));

  const handlePreset = (idValue) => {
    if (idValue === 'custom') {
      onChange({ preset: 'custom', from: customFrom, to: customTo, label: `${customFrom} → ${customTo}` });
      return;
    }
    onChange(resolvePreset(idValue));
  };

  const applyCustom = () => {
    if (!customFrom || !customTo) return;
    const fromD = new Date(customFrom);
    const toD = new Date(customTo);
    const [f, t] = fromD <= toD ? [customFrom, customTo] : [customTo, customFrom];
    onChange(resolvePreset('custom', { from: f, to: t }));
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-1 scrollbar-thin">
        <span className="mr-1 hidden shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400 sm:inline-flex dark:text-ink-500">
          <CalendarRange className="h-3.5 w-3.5" /> Range
        </span>
        {DATE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => handlePreset(p.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              preset === p.id
                ? 'bg-ink-900 text-white shadow-sm dark:bg-emerald-500 dark:text-ink-950'
                : 'bg-white text-ink-600 ring-1 ring-ink-200 hover:bg-ink-50 dark:bg-ink-900 dark:text-ink-300 dark:ring-ink-700 dark:hover:bg-ink-800'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === 'custom' ? (
        <div className="flex flex-wrap items-end gap-2">
          <div>
            <label className="label !mb-1" htmlFor={`${id}-from`}>
              From
            </label>
            <input
              id={`${id}-from`}
              type="date"
              className="input !w-auto !py-2"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="label !mb-1" htmlFor={`${id}-to`}>
              To
            </label>
            <input
              id={`${id}-to`}
              type="date"
              className="input !w-auto !py-2"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
            />
          </div>
          <button type="button" className="btn-primary !py-2" onClick={applyCustom}>
            Apply
          </button>
        </div>
      ) : null}
    </div>
  );
}
