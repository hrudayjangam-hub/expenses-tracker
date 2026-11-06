const { z } = require('zod');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const asyncHandler = require('../utils/asyncHandler');
const { buildDateFilter, dayKeysBetween, monthKeysBetween, monthLabel, round2, startOfDay } = require('../utils/date');

const querySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  include: z.enum(['transactions']).optional(),
});

const FALLBACK_COLORS = [
  '#0f766e', '#f97316', '#6366f1', '#ec4899', '#0ea5e9',
  '#eab308', '#8b5cf6', '#14b8a6', '#ef4444', '#84cc16',
];

// GET /api/reports/summary?from=&to=&type=
const summary = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const q = req.valid.query;
  const now = new Date();

  const from = q.from && !Number.isNaN(new Date(q.from).getTime()) ? startOfDay(new Date(q.from)) : null;
  const to = q.to && !Number.isNaN(new Date(q.to).getTime()) ? new Date(new Date(q.to).setHours(23, 59, 59, 999)) : null;

  const match = { userId };
  const range = buildDateFilter(q.from, q.to);
  if (range) match.date = range;

  const [totalsRows, categoryRows, paymentRows, dayRows, monthRows, categories, largest, exportRows] =
    await Promise.all([
      Transaction.aggregate([
        { $match: match },
        { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]),
      Transaction.aggregate([
        { $match: match },
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
        { $match: { ...match, type: 'expense' } },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
      ]),
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$date' } }, type: '$type' },
            total: { $sum: '$amount' },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: { ym: { $dateToString: { format: '%Y-%m', date: '$date' } }, type: '$type' },
            total: { $sum: '$amount' },
          },
        },
      ]),
      Category.find({ userId }).lean(),
      Transaction.find(match).sort({ date: -1 }).limit(10).lean(),
      q.include === 'transactions'
        ? Transaction.find(match).sort({ date: -1 }).limit(5000).lean()
        : Promise.resolve([]),
    ]);

  const totals = { income: 0, expense: 0, count: 0 };
  totalsRows.forEach((r) => {
    totals[r._id] = round2(r.total);
    totals.count += r.count;
  });
  const savings = round2(totals.income - totals.expense);
  const savingsRate = totals.income > 0 ? round2((savings / totals.income) * 100) : 0;

  const colorMap = {};
  categories.forEach((c, i) => {
    colorMap[`${c.type}:${c.name}`] = c.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length];
  });

  const expenseTotalForPercent = totals.expense || 1;
  const categoryBreakdown = categoryRows.map((r) => ({
    category: r._id.category,
    type: r._id.type,
    amount: round2(r.total),
    count: r.count,
    percent:
      r._id.type === 'expense'
        ? round2((r.total / expenseTotalForPercent) * 100)
        : round2((r.total / (totals.income || 1)) * 100),
    color: colorMap[`${r._id.type}:${r._id.category}`] || FALLBACK_COLORS[0],
  }));

  const paymentMethodBreakdown = paymentRows.map((r) => ({
    method: r._id,
    amount: round2(r.total),
    count: r.count,
    percent: round2((r.total / expenseTotalForPercent) * 100),
  }));

  const dayMap = {};
  dayRows.forEach((r) => {
    const k = r._id.day;
    dayMap[k] = dayMap[k] || { date: k, income: 0, expense: 0 };
    dayMap[k][r._id.type] = round2(r.total);
  });

  const periodFrom = from || new Date(Math.min(...Object.keys(dayMap).map((k) => new Date(`${k}T00:00:00`).getTime()), Date.now()));
  const periodTo = to || now;
  const dayKeys = Object.keys(dayMap).length ? dayKeysBetween(periodFrom, periodTo) : [];
  const daily = dayKeys.map((k) => dayMap[k] || { date: k, income: 0, expense: 0 });

  const monthMap = {};
  monthRows.forEach((r) => {
    const k = r._id.ym;
    monthMap[k] = monthMap[k] || { key: k, income: 0, expense: 0 };
    monthMap[k][r._id.type] = round2(r.total);
  });
  const monthly = Object.keys(monthMap)
    .sort()
    .map((k) => ({ ...monthMap[k], label: monthLabel(k) }));

  res.json({
    success: true,
    period: {
      from: (from || null) && from.toISOString(),
      to: (to || null) && to.toISOString(),
      label: from && to ? `${from.toISOString().slice(0, 10)} to ${to.toISOString().slice(0, 10)}` : 'All time',
    },
    totalIncome: totals.income,
    totalExpenses: totals.expense,
    savings,
    savingsRate,
    transactionCount: totals.count,
    categoryBreakdown,
    paymentMethodBreakdown,
    daily,
    monthly,
    largestExpenses: largest
      .filter((t) => t.type === 'expense')
      .map((t) => ({
        _id: t._id,
        amount: t.amount,
        category: t.category,
        description: t.description,
        date: t.date,
        paymentMethod: t.paymentMethod,
      })),
    transactions: exportRows.map((t) => ({
      _id: t._id,
      date: t.date,
      type: t.type,
      category: t.category,
      description: t.description,
      amount: t.amount,
      paymentMethod: t.paymentMethod,
    })),
  });
});

module.exports = { summary, schemas: { querySchema } };
