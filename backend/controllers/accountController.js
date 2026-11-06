const { z } = require('zod');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { round2 } = require('../utils/date');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const paramsSchema = z.object({ id: objectId });

const accountBody = z.object({
  name: z.string().trim().min(1, 'Account name is required').max(40),
  type: z.enum(['checking', 'savings', 'cash', 'wallet', 'credit']).default('checking'),
  openingBalance: z.coerce.number().max(100000000000).min(-100000000000).default(0),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #64748b')
    .optional(),
  isArchived: z.coerce.boolean().optional(),
});

const withBalances = async (userId, { includeArchived = false } = {}) => {
  const filter = { userId };
  if (!includeArchived) filter.isArchived = { $ne: true };

  const [accounts, sums] = await Promise.all([
    Account.find(filter).sort({ createdAt: 1 }).lean(),
    Transaction.aggregate([
      { $match: { userId, accountId: { $ne: null } } },
      {
        $group: {
          _id: { accountId: '$accountId', type: '$type' },
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const byAccount = {};
  sums.forEach((s) => {
    const id = String(s._id.accountId);
    byAccount[id] = byAccount[id] || { income: 0, expense: 0 };
    byAccount[id][s._id.type] = round2(s.total);
  });

  return accounts.map((a) => {
    const flow = byAccount[String(a._id)] || { income: 0, expense: 0 };
    const balance = round2((a.openingBalance || 0) + flow.income - flow.expense);
    return { ...a, income: flow.income, expense: flow.expense, balance };
  });
};

// GET /api/accounts
const list = asyncHandler(async (req, res) => {
  const accounts = await withBalances(req.user._id, {
    includeArchived: req.query.includeArchived === 'true',
  });
  const netWorth = round2(accounts.reduce((s, a) => s + a.balance, 0));
  res.json({ success: true, accounts, netWorth });
});

// POST /api/accounts
const create = asyncHandler(async (req, res) => {
  const data = req.valid.body;
  const dupe = await Account.findOne({ userId: req.user._id, name: data.name });
  if (dupe) throw new ApiError(409, 'An account with that name already exists.');
  const account = await Account.create({ ...data, userId: req.user._id });
  res.status(201).json({ success: true, message: 'Account created.', account });
});

// PUT /api/accounts/:id
const update = asyncHandler(async (req, res) => {
  const data = req.valid.body;
  if (data.name) {
    const dupe = await Account.findOne({
      userId: req.user._id,
      name: data.name,
      _id: { $ne: req.params.id },
    });
    if (dupe) throw new ApiError(409, 'An account with that name already exists.');
  }
  const account = await Account.findOneAndUpdate(
    { _id: req.params.id, userId: req.user._id },
    data,
    { new: true, runValidators: true }
  );
  if (!account) throw new ApiError(404, 'Account not found.');
  res.json({ success: true, message: 'Account updated.', account });
});

// DELETE /api/accounts/:id
const remove = asyncHandler(async (req, res) => {
  const inUse = await Transaction.countDocuments({ accountId: req.params.id, userId: req.user._id });
  if (inUse > 0) {
    throw new ApiError(409, `This account has ${inUse} transaction(s). Archive it instead of deleting.`);
  }
  const account = await Account.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!account) throw new ApiError(404, 'Account not found.');
  res.json({ success: true, message: 'Account deleted.', account });
});

// GET /api/accounts/net-worth — monthly balance history for the chart
const netWorthHistory = asyncHandler(async (req, res) => {
  const months = Math.min(36, Math.max(3, Number(req.query.months) || 12));
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const [accounts, flows] = await Promise.all([
    Account.find({ userId: req.user._id }).lean(),
    Transaction.aggregate([
      { $match: { userId: req.user._id, date: { $gte: start } } },
      {
        $group: {
          _id: {
            ym: { $dateToString: { format: '%Y-%m', date: '$date' } },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
    ]),
  ]);

  const flowMap = {};
  flows.forEach((f) => {
    const k = f._id.ym;
    flowMap[k] = flowMap[k] || { income: 0, expense: 0 };
    flowMap[k][f._id.type] = round2(f.total);
  });

  // balance before the window = opening balances minus flows before start
  const earlier = await Transaction.aggregate([
    { $match: { userId: req.user._id, date: { $lt: start } } },
    { $group: { _id: '$type', total: { $sum: '$amount' } } },
  ]);
  let base = accounts.reduce((s, a) => s + (a.openingBalance || 0), 0);
  earlier.forEach((e) => {
    base += e._id === 'income' ? e.total : -e.total;
  });

  const points = [];
  let running = round2(base);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  for (let i = 0; i < months; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = fmt(d);
    const flow = flowMap[key] || { income: 0, expense: 0 };
    running = round2(running + flow.income - flow.expense);
    points.push({ month: key, label: d.toLocaleDateString('en', { month: 'short' }), balance: running });
  }

  res.json({ success: true, points, netWorth: points[points.length - 1]?.balance || 0 });
});

module.exports = {
  list,
  create,
  update,
  remove,
  netWorthHistory,
  schemas: { accountBody, objectId, paramsSchema },
};
