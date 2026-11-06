const { z } = require('zod');
const Transaction = require('../models/Transaction');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { buildDateFilter, round2 } = require('../utils/date');
const { PAYMENT_METHODS } = require('../utils/defaults');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const paramsSchema = z.object({ id: objectId });

const createSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Amount must be greater than 0').max(100000000000),
  category: z.string().trim().min(1, 'Category is required').max(60),
  description: z.string().trim().max(300).optional().default(''),
  date: z.coerce.date({ errorMap: () => ({ message: 'A valid date is required' }) }),
  paymentMethod: z.enum(PAYMENT_METHODS),
});

const updateSchema = createSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: 'No fields to update' }
);

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(200).optional().default(''),
  type: z.enum(['income', 'expense']).optional(),
  category: z.string().trim().max(60).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(['date', 'amount', 'category', 'description', 'createdAt']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const buildMatch = (userId, q) => {
  const match = { userId };
  if (q.type) match.type = q.type;
  if (q.category) match.category = q.category;
  if (q.paymentMethod) match.paymentMethod = q.paymentMethod;
  if (q.search) {
    const rx = new RegExp(q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    match.$or = [{ description: rx }, { category: rx }];
  }
  const range = buildDateFilter(q.from, q.to);
  if (range) match.date = range;
  return match;
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
  const data = req.valid.body;
  const tx = await Transaction.create({ ...data, userId: req.user._id });
  res.status(201).json({ success: true, message: 'Transaction added.', transaction: tx });
});

// PUT /api/transactions/:id
const update = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    req.valid.body,
    { new: true, runValidators: true }
  );
  if (!tx) throw new ApiError(404, 'Transaction not found.');
  res.json({ success: true, message: 'Transaction updated.', transaction: tx });
});

// DELETE /api/transactions/:id
const remove = asyncHandler(async (req, res) => {
  const tx = await Transaction.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!tx) throw new ApiError(404, 'Transaction not found.');
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
