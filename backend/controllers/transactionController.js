const { z } = require('zod');
const Transaction = require('../models/Transaction');
const Account = require('../models/Account');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildDateFilter, round2 } = require('../utils/date');
const { PAYMENT_METHODS } = require('../utils/defaults');
const { checkBudgetAlerts } = require('../utils/budgetAlerts');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const paramsSchema = z.object({ id: objectId });

const splitSchema = z
  .array(
    z.object({
      category: z.string().trim().min(1).max(60),
      amount: z.coerce.number().positive().max(100000000000),
    })
  )
  .min(2, 'A split needs at least 2 parts')
  .max(10, 'A split can have at most 10 parts')
  .optional()
  .nullable();

const baseBody = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Amount must be greater than 0').max(100000000000),
  category: z.string().trim().max(60).optional().default('Other'),
  description: z.string().trim().max(300).optional().default(''),
  date: z.coerce.date({ errorMap: () => ({ message: 'A valid date is required' }) }),
  paymentMethod: z.enum(PAYMENT_METHODS),
  accountId: objectId.nullable().optional(),
  splits: splitSchema,
});

const createSchema = baseBody.refine(
  (data) => !data.splits || data.splits.length >= 2,
  { message: 'A split needs at least 2 parts', path: ['splits'] }
);

const updateSchema = baseBody
  .partial()
  .refine((data) => Object.keys(data).length > 0, { message: 'No fields to update' });

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional().default(''),
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().trim().max(60).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  accountId: objectId.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(['date', 'amount', 'category', 'description', 'createdAt']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const assertAccount = async (userId, accountId) => {
  if (!accountId) return null;
  const account = await Account.findOne({ _id: accountId, userId });
  if (!account) throw new ApiError(400, 'Choose one of your own accounts.');
  return account;
};

const buildMatch = (userId, q) => {
  const match = { userId };
  if (q.type) match.type = q.type;
  if (q.category) {
    if (q.category === 'Split') match.splits = { $exists: true, $ne: [] };
    else match.category = q.category;
  }
  if (q.paymentMethod) match.paymentMethod = q.paymentMethod;
  if (q.accountId) match.accountId = q.accountId;
  if (q.search) {
    const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ description: rx }, { category: rx }];
  }
  const range = buildDateFilter(q.from, q.to);
  if (range) match.date = range;
  return match;
};

const scheduleAlerts = (userId) => {
  // Fire-and-forget: never delay the response for an email check.
  setTimeout(() => {
    const User = require('../models/User');
    User.findById(userId)
      .then((u) => (u ? checkBudgetAlerts(u) : null))
      .catch(() => {});
  }, 0);
};

// GET /api/transactions
const list = asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const match = buildMatch(req.user._id, q);

  const sort = { [q.sort]: q.order === 'asc' ? 1 : -1 };
  if (q.sort !== 'date') sort.date = -1;

  const [items, total] = await Promise.all([
    Transaction.find(match)
      .sort(sort)
      .skip((q.page - 1) * q.limit)
      .limit(q.limit)
      .lean(),
    Transaction.countDocuments(match),
  ]);

  res.json({
    success: true,
    transactions: items,
    pagination: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / q.limit)),
      hasNext: q.page * q.limit < total,
      hasPrev: q.page > 1,
    },
  });
});

// GET /api/transactions/:id
const getOne = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOne({ _id: req.params.id, userId: req.user._id }).lean();
  if (!tx) throw new ApiError(404, 'Transaction not found.');
  res.json({ success: true, transaction: tx });
});

// POST /api/transactions
const create = asyncHandler(async (req, res) => {
  const data = { ...req.valid.body };
  await assertAccount(req.user._id, data.accountId);
  if (data.splits && data.splits.length) data.category = 'Split';
  const tx = await Transaction.create({ ...data, userId: req.user._id });
  scheduleAlerts(req.user._id);
  res.status(201).json({ success: true, message: 'Transaction added.', transaction: tx });
});

// PUT /api/transactions/:id
const update = asyncHandler(async (req, res) => {
  const data = { ...req.valid.body };
  if (data.accountId !== undefined) await assertAccount(req.user._id, data.accountId);
  if (data.splits && data.splits.length) data.category = 'Split';

  const update = { ...data };
  const unset = {};
  if (data.splits === null) {
    delete update.splits;
    unset.splits = '';
    update.category = data.category || 'Other';
  }
  if (Object.keys(unset).length) update.$unset = unset;

  const tx = await Transaction.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    update,
    { new: true, runValidators: true }
  );
  if (!tx) throw new ApiError(404, 'Transaction not found.');
  scheduleAlerts(req.user._id);
  res.json({ success: true, message: 'Transaction updated.', transaction: tx });
});

// DELETE /api/transactions/:id
const remove = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!tx) throw new ApiError(404, 'Transaction not found.');
  scheduleAlerts(req.user._id);
  res.json({ success: true, message: 'Transaction deleted.', transaction: tx });
});

// GET /api/transactions/stats — lightweight totals for the active filters
const stats = asyncHandler(async (req, res) => {
  const q = req.valid.query;
  const match = buildMatch(req.user._id, q);
  const rows = await Transaction.aggregate([
    { $match: match },
    { $group: { _id: '$type', total: { $sum: '$amount' }, count: { $sum: 1 } } },
  ]);
  const totals = { income: 0, expense: 0 };
  rows.forEach((r) => {
    totals[r._id] = round2(r.total);
  });
  res.json({ success: true, totals, count: rows.reduce((s, r) => s + r.count, 0) });
});

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  stats,
  schemas: { createSchema, updateSchema, listQuerySchema, objectId, paramsSchema },
};
