import { toISODate } from './format';

const startOfWeek = (d) => {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
};

export const DATE_PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'year', label: 'This Year' },
  { id: 'custom', label: 'Custom' },
  { id: 'all', label: 'All Time' },
];

/** Resolves a preset id into { from, to, label, preset } */
export const resolvePreset = (preset, custom = {}) => {
  const now = new Date();
  const endOfToday = toISODate(now);

  switch (preset) {
    case 'today': {
      return { preset, from: endOfToday, to: endOfToday, label: 'Today' };
    }
    case 'week': {
      const from = startOfWeek(now);
      return { preset, from: toISODate(from), to: endOfToday, label: 'This Week' };
    }
    case 'month': {
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      return { preset, from: toISODate(from), to: endOfToday, label: 'This Month' };
    }
    case 'year': {
      const from = new Date(now.getFullYear(), 0, 1);
      return { preset, from: toISODate(from), to: endOfToday, label: 'This Year' };
    }
    case 'custom': {
      const from = custom.from || '';
      const to = custom.to || '';
      if (!from || !to) return { preset, from, to, label: 'Custom range' };
      return { preset, from, to, label: `${from} → ${to}` };
    }
    case 'all':
    default:
      return { preset: 'all', from: '', to: '', label: 'All Time' };
  }
};

export const DEFAULT_PRESET = 'month';
