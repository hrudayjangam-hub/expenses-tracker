const { z } = require('zod');
const Budget = require('../models/Budget');
const Transaction = require('../models/Transaction');
const Category = require('../models/Category');
const Household = require('../models/Household');
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
  householdId: objectId.nullable().optional(),
});

const listQuery = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

/** userIds whose transactions count toward this budget. */
const scopeUserIds = async (userId, budget) => {
  if (!budget.householdId) return [userId];
  const h = await Household.findOne({
    _id: budget.householdId,
    'members.userId': userId,
  }).select('members.userId').lean();
  if (!h) return [userId];
  return h.members.map((m) => m.userId);
};

const spentMatch = (userIds, budget, bounds) => {
  const base = { userId: { $in: userIds }, type: 'expense', date: bounds };
  if (budget.category === OVERALL) return base;
  // category budgets count whole transactions in that category plus any split parts
  return base;
};

/**
 * spent for a category = whole non-split txs in that category
 *                       + split portions allocated to that category
 * spent for OVERALL    = all expenses (splits already sum to their parent)
 */
const spentFor = async (userIds, budget) => {
  const bounds = monthBounds(budget.year, budget.month);
  const base = spentMatch(userIds, budget, bounds);

  if (budget.category === OVERALL) {
    const [agg] = await Transaction.aggregate([
      { $match: base },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);
    return round2(agg ? agg.total : 0);
  }

  const [whole, split] = await Promise.all([
    Transaction.aggregate([
      { $match: { ...base, category: budget.category, splits: { $exists: false } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { ...base, splits: { $exists: true, $ne: [] } } },
      { $unwind: '$splits' },
      { $match: { 'splits.category': budget.category } },
      { $group: { _id: null, total: { $sum: '$splits.amount' } } },
    ]),
  ]);
  return round2((whole[0]?.total || 0) + (split[0]?.total || 0));
};

const computeSpent = async (userId, budgets) => {
  const now = new Date();
  const results = await Promise.all(
    budgets.map(async (b) => {
      const userIds = await scopeUserIds(userId, b);
      const spent = await spentFor(userIds, b);
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

/** Budgets visible to this user: personal + every household they belong to. */
const visibleFilter = async (userId) => {
  const households = await Household.find({ 'members.userId': userId }).select('_id').lean();
  const hids = households.map((h) => h._id);
  const or = [{ userId, householdId: null }];
  if (hids.length) or.push({ householdId: { $in: hids } });
  return { $or: or };
};

// GET /api/budgets?month=&year=
const list = asyncHandler(async (req, res) => {
  const now = new Date();
  const { month = now.getMonth() + 1, year = now.getFullYear() } = req.valid.query;
  const filter = await visibleFilter(req.user._id);
  const budgets = await Budget.find({ ...filter, month, year }).sort({ category: 1 }).lean();
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
  const filter = await visibleFilter(req.user._id);
  const budgets = await Budget.find(filter).sort({ year: -1, month: -1, category: 1 }).lean();
  res.json({ success: true, budgets });
});

// POST /api/budgets
const create = asyncHandler(async (req, res) => {
  const data = { ...req.valid.body, householdId: req.valid.body.householdId || null };

  if (data.householdId) {
    const h = await Household.findOne({ _id: data.householdId, 'members.userId': req.user._id });
    if (!h) throw new ApiError(403, 'You can only create budgets for your own household.');
  }

  if (data.category !== OVERALL) {
    const cat = await Category.findOne({
      userId: req.user._id,
      name: data.category,
      type: 'expense',
    }).lean();
    if (!cat) throw new ApiError(400, 'Choose an existing expense category for this budget.');
  }

  const dupeFilter = {
    category: data.category,
    month: data.month,
    year: data.year,
    ...(data.householdId ? { householdId: data.householdId } : { householdId: null }),
  };
  const existing = await Budget.findOne(dupeFilter);
  if (existing) {
    throw new ApiError(409, `A budget for ${data.category} already exists for this month. Edit it instead.`);
  }

  const budget = await Budget.create({ ...data, userId: req.user._id });
  const [enriched] = await computeSpent(req.user._id, [budget.toObject()]);
  res.status(201).json({ success: true, message: 'Budget created.', budget: enriched });
});

// PUT /api/budgets/:id
const update = asyncHandler(async (req, res) => {
  const visible = await visibleFilter(req.user._id);
  const budget = await Budget.findOne({ _id: req.params.id, ...visible });
  if (!budget) throw new ApiError(404, 'Budget not found.');
  const data = req.valid.body;
  if (data.householdId !== undefined) {
    if (data.householdId && data.householdId !== String(budget.householdId || '')) {
      throw new ApiError(400, 'A budget cannot be moved between households.');
    }
    delete data.householdId;
  }
  if (data.category && data.category !== budget.category) {
    const dupe = await Budget.findOne({
      category: data.category,
      month: data.month ?? budget.month,
      year: data.year ?? budget.year,
      householdId: budget.householdId,
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
  const visible = await visibleFilter(req.user._id);
  const budget = await Budget.findOneAndDelete({ _id: req.params.id, ...visible });
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
  visibleFilter,
  OVERALL,
  schemas: { budgetBody, listQuery, objectId, paramsSchema },
};
