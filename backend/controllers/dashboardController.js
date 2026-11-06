const { z } = require('zod');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const { computeSpent, OVERALL } = require('./budgetController');
const Budget = require('../models/Budget');
const {
  buildDateFilter,
  monthBounds,
  monthKeysBetween,
  dayKeysBetween,
  monthLabel,
  formatMonthKey,
  round2,
  startOfDay,
} = require('../utils/date');

const FALLBACK_COLORS = [
  '#0f766e', '#f97316', '#6366f1', '#ec4899', '#0ea5e9',
  '#eab308', '#8b5cf6', '#14b8a6', '#ef4444', '#84cc16',
];

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
});

const rangeMatch = (userId, q) => {
  const range = buildDateFilter(q.from, q.to);
  return { userId, ...(range ? { date: range } : {}) };
};

const totalsFor = async (match) => {
  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const out = { income: 0, expense: 0, count: 0 };
  rows.forEach((r) => {
    out[r._id] = round2(r.total);
    out.count += r.count;
  });
  out.savings = round2(out.income - out.expense);
  return out;
};

// GET /api/dashboard/summary?from=&to=
const summary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const q = req.valid.query;
  const now = new Date();

  const [rangeTotals, monthTotals, recent, budgets] = await Promise.all([
    totalsFor(rangeMatch(userId, q)),
    totalsFor({ userId, date: monthBounds(now.getFullYear(), now.getMonth() + 1) }),
    Transaction.find({ userId }).sort({ date: -1, createdAt: -1 }).limit(8).lean(),
    Budget.find({ userId, month: now.getMonth() + 1, year: now.getFullYear() }).lean(),
  ]);

  const budgetProgress = await computeSpent(userId, budgets);

  // last 14 days activity for the overview sparkline
  const activityStart = startOfDay(new Date(now.getTime() - 13 * 24 * 60 * 60 * 1000));
  const dailyRows = await Transaction.aggregate([
    { $match: { userId, date: { $gte: activityStart } } },
    {
      $group: {
        _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, type: '$type' },
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);
  const activityMap = {};
  dailyRows.forEach((r) => {
    const key = r._id.day;
    activityMap[key] = activityMap[key] || { date: key, income: 0, expense: 0, count: 0 };
    activityMap[key][r._id.type] = round2(r.total);
    activityMap[key].count += r.count;
  });
  const activity = dayKeysBetween(activityStart, now).map(
    (d) => activityMap[d] || { date: d, income: 0, expense: 0, count: 0 }
  );

  res.json({
    success: true,
    range: { from: q.from || null, to: q.to || null },
    totals: rangeTotals,
    month: {
      ...monthTotals,
      label: `${formatMonthKey(now.getFullYear(), now.getMonth() + 1)}`,
      savings: monthTotals.savings,
    },
    recentTransactions: recent,
    budgetProgress,
    activity,
  });
});

// GET /api/dashboard/analytics?from=&to=
const analytics = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const q = req.valid.query;
  const now = new Date();

  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const from = q.from && !Number.isNaN(new Date(q.from).getTime()) ? new Date(q.from) : defaultFrom;
  const to = q.to && !Number.isNaN(new Date(q.to).getTime()) ? new Date(q.to) : now;

  const match = { userId, date: { $gte: startOfDay(from), $lte: to } };

  const [monthRows, dayRows, categoryRows, yearlyRows, categories] = await Promise.all([
    Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { ym: { $dateToString: { format: '%Y-%m', date: '$date' } }, type: '$type' },
          total: { $sum: '$amount' },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]),
    Transaction.aggregate([
      { $match: { userId, date: match.date } },
      {
        $group: {
          _id: { category: '$category', type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]),
    Transaction.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: { y: { $year: '$date' }, type: '$type' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.y': 1 } },
    ]),
    Category.find({ userId }).lean(),
  ]);

  const colorMap = {};
  categories.forEach((c, i) => {
    colorMap[`${c.type}:${c.name}`] = c.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
  });

  // --- monthly income vs expense (filled) ---
  const monthMap = {};
  monthRows.forEach((r) => {
    const k = r._id.ym;
    monthMap[k] = monthMap[k] || { income: 0, expense: 0 };
    monthMap[k][r._id.type] = round2(r.total);
  });
  const incomeVsExpense = monthKeysBetween(from, to).map((k) => ({
    key: k,
    label: monthLabel(k),
    income: monthMap[k]?.income || 0,
    expense: monthMap[k]?.expense || 0,
  }));

  // --- daily trend (filled) ---
  const dayMap = {};
  dayRows.forEach((r) => {
    const k = r._id.day;
    dayMap[k] = dayMap[k] || { income: 0, expense: 0, count: 0 };
    dayMap[k][r._id.type] = round2(r.total);
    dayMap[k].count += r.count;
  });
  const dayKeys = dayKeysBetween(from, to);
  const daily = dayKeys.map((k) => ({
    date: k,
    income: dayMap[k]?.income || 0,
    expense: dayMap[k]?.expense || 0,
    count: dayMap[k]?.count || 0,
  }));

  // --- weekly buckets (ISO weeks starting Monday) ---
  const weekMap = {};
  daily.forEach((d) => {
    const dt = new Date(`${d.date}T00:00:00`);
    const day = (dt.getDay() + 6) % 7;
    dt.setDate(dt.getDate() - day);
    const key = dt.toISOString().slice(0, 10);
    weekMap[key] = weekMap[key] || { week: key, income: 0, expense: 0 };
    weekMap[key].income = round2(weekMap[key].income + d.income);
    weekMap[key].expense = round2(weekMap[key].expense + d.expense);
  });
  const weekly = Object.values(weekMap)
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((w) => ({ ...w, label: new Date(`${w.week}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }));

  // --- category breakdown ---
  const categoryBreakdown = [];
  const incomeBreakdown = [];
  categoryRows.forEach((r) => {
    const item = {
      name: r._id.category,
      value: round2(r.total),
      count: r.count,
      color: colorMap[`${r._id.type}:${r._id.category}`] || FALLBACK_COLORS[categoryBreakdown.length % FALLBACK_COLORS.length],
    };
    if (r._id.type === 'expense') categoryBreakdown.push(item);
    else incomeBreakdown.push(item);
  });

  // --- yearly (all time) ---
  const yearlyMap = {};
  yearlyRows.forEach((r) => {
    const y = r._id.y;
    yearlyMap[y] = yearlyMap[y] || { year: y, income: 0, expense: 0, count: 0 };
    yearlyMap[y][r._id.type] = round2(r.total);
    yearlyMap[y].count += r.count;
  });
  const yearly = Object.values(yearlyMap).sort((a, b) => a.year - b.year);

  // --- stats ---
  const totals = await totalsFor({ userId, date: match.date });
  const days = Math.max(1, dayKeys.length);
  const topCategories = [...categoryBreakdown].sort((a, b) => b.value - a.value);
  const stats = {
    totalIncome: totals.income,
    totalExpenses: totals.expense,
    savings: totals.savings,
    savingsRate: totals.income > 0 ? round2((totals.savings / totals.income) * 100) : 0,
    transactionCount: totals.count,
    avgDailyExpense: round2(totals.expense / days),
    avgMonthlyExpense: round2(totals.expense / Math.max(1, incomeVsExpense.length)),
    avgDailyIncome: round2(totals.income / days),
    highestCategory: topCategories[0]?.name || null,
    highestCategoryAmount: topCategories[0]?.value || 0,
    activeDays: daily.filter((d) => d.count > 0).length,
    daysInPeriod: days,
    biggestExpenseDay: daily.reduce((max, d) => (d.expense > max.expense ? d : max), { date: null, expense: 0 }),
  };

  res.json({
    success: true,
    range: { from: from.toISOString(), to: to.toISOString() },
    incomeVsExpense,
    daily,
    weekly,
    yearly,
    categoryBreakdown,
    incomeBreakdown,
    topCategories: topCategories.slice(0, 5),
    stats,
  });
});

module.exports = { summary, analytics, schemas: { querySchema }, OVERALL, monthLabel };
