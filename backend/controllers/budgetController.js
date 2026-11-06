const { z } = require('zod');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { monthBounds, round2, formatMonthKey } = require('../utils/date');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const paramsSchema = z.object({ id: objectId });
const OVERALL = 'Overall';

const budgetBody = z.object({
  category: z.string().trim().min(1, 'Category is required').max(60),
  amount: z.coerce.number().positive('Budget must be greater than 0').max(100000000000),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

const listQuery = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

const computeSpent = async (userId, budgets) => {
  const now = new Date();
  const results = await Promise.all(
    budgets.map(async (b) => {
      const bounds = monthBounds(b.year, b.month);
      const match = {
        userId,
        type: 'expense',
        date: bounds,
        ...(b.category === OVERALL ? {} : { category: b.category }),
      };
      const [agg] = await Transaction.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } },
      ]);
      const spent = round2(agg ? agg.total : 0);
      const amount = round2(b.amount);
      const percent = amount > 0 ? Math.round((spent / amount) * 1000) / 10 : 0;
      let status = 'ok';
      if (percent >= 100) status = 'over';
      else if (percent >= 90) status = 'danger';
      else if (percent >= 75) status = 'warning';
      return {
        ...b,
        spent,
        remaining: round2(amount - spent),
        percent,
        status,
        isCurrentMonth: b.year === now.getFullYear() && b.month === now.getMonth() + 1,
      };
    })
  );
  return results;
};

// GET /api/budgets?month=&year=
const list = asyncHandler(async (req, res) => {
  const now = new Date();
  const { month = now.getMonth() + 1, year = now.getFullYear() } = req.valid.query;
  const budgets = await Budget.find({ userId: req.user._id, month, year }).sort({ category: 1 }).lean();
  const withSpent = await computeSpent(req.user._id, budgets);
  res.json({
    success: true,
    budgets: withSpent,
    month,
    year,
    monthKey: formatMonthKey(year, month),
  });
});

// GET /api/budgets/overview — budgets across months for the sidebar/insights
const overview = asyncHandler(async (req, res) => {
  const budgets = await Budget.find({ userId: req.user._id }).sort({ year: -1, month: -1, category: 1 }).lean();
  res.json({ success: true, budgets });
});

// POST /api/budgets
const create = asyncHandler(async (req, res) => {
  const data = req.valid.body;
  if (data.category !== OVERALL) {
    const cat = await Category.findOne({
      userId: req.user._id,
      name: data.category,
      type: 'expense',
    }).lean();
    if (!cat) throw new ApiError(400, 'Choose an existing expense category for this budget.');
  }
  const existing = await Budget.findOne({
    userId: req.user._id,
    category: data.category,
    month: data.month,
    year: data.year,
  });
  if (existing) {
    throw new ApiError(409, `A budget for ${data.category} already exists for this month. Edit it instead.`);
  }
  const budget = await Budget.create({ ...data, userId: req.user._id });
  const [enriched] = await computeSpent(req.user._id, [budget.toObject()]);
  res.status(201).json({ success: true, message: 'Budget created.', budget: enriched });
});

// PUT /api/budgets/:id
const update = asyncHandler(async (req, res) => {
  const budget = await Budget.findOne({ _id: req.params.id, userId: req.user._id });
  if (!budget) throw new ApiError(404, 'Budget not found.');
  const data = req.valid.body;
  if (data.category && data.category !== budget.category) {
    const dupe = await Budget.findOne({
      userId: req.user._id,
      category: data.category,
      month: data.month ?? budget.month,
      year: data.year ?? budget.year,
      _id: { $ne: budget._id },
    });
    if (dupe) throw new ApiError(409, 'A budget for that category already exists for this month.');
  }
  Object.assign(budget, data);
  await budget.save();
  const [enriched] = await computeSpent(req.user._id, [budget.toObject()]);
  res.json({ success: true, message: 'Budget updated.', budget: enriched });
});

// DELETE /api/budgets/:id
const remove = asyncHandler(async (req, res) => {
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!budget) throw new ApiError(404, 'Budget not found.');
  res.json({ success: true, message: 'Budget deleted.', budget });
});

module.exports = {
  list,
  overview,
  create,
  update,
  remove,
  computeSpent,
  OVERALL,
  schemas: { budgetBody, listQuery, objectId, paramsSchema },
};
