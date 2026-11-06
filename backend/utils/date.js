const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const isValidDate = (v) => v && !Number.isNaN(new Date(v).getTime());

/**
 * Builds a MongoDB date range filter from optional `from` / `to` ISO strings.
 * Missing bounds are left open (all time).
 */
const buildDateFilter = (from, to) => {
  const filter = {};
  if (isValidDate(from)) filter.$gte = startOfDay(new Date(from));
  if (isValidDate(to)) filter.$lte = endOfDay(new Date(to));
  return Object.keys(filter).length ? filter : null;
};

const monthBounds = (year, month) => ({
  $gte: new Date(year, month - 1, 1, 0, 0, 0, 0),
  $lt: new Date(year, month, 1, 0, 0, 0, 0),
});

const formatMonthKey = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthLabel = (key) => {
  const [y, m] = key.split('-').map(Number);
  return `${MONTH_LABELS[m - 1]} ${String(y).slice(2)}`;
};

/** Builds a chronological array of month keys between two dates. */
const monthKeysBetween = (from, to) => {
  const start = startOfDay(from);
  const end = startOfDay(to);
  const keys = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cur <= end && keys.length < 600) {
    keys.push(formatMonthKey(cur.getFullYear(), cur.getMonth() + 1));
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys;
};

/** Builds a chronological array of YYYY-MM-DD strings between two dates. */
const dayKeysBetween = (from, to) => {
  const keys = [];
  const cur = startOfDay(from);
  const end = startOfDay(to);
  while (cur <= end && keys.length < 1500) {
    keys.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return keys;
};

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

module.exports = {
  DAY_MS,
  startOfDay,
  endOfDay,
  isValidDate,
  buildDateFilter,
  monthBounds,
  formatMonthKey,
  monthLabel,
  MONTH_LABELS,
  monthKeysBetween,
  dayKeysBetween,
  round2,
};
