process.env.NODE_ENV = 'test';
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/expenses_tracker_test';
process.env.JWT_SECRET = 'test_secret_key_for_automated_tests';
process.env.JWT_EXPIRES_IN = '1h';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const app = require('../server');

let server;
let base;
let token;
let otherToken;
let userId;
let otherUserId;
let txId;
let budgetId;
let categoryId;

const req = async (method, path, { body, token: t } = {}) => {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  return { status: res.status, body: json };
};

const registerUser = async (name, email, password) => {
  const res = await req('POST', '/api/auth/register', { body: { name, email, password } });
  assert.equal(res.status, 201);
  return res.body;
};

before(async () => {
  await mongoose.connection.asPromise();
  await mongoose.connection.db.dropDatabase();
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await mongoose.connection.db.dropDatabase();
  await mongoose.disconnect();
});

test('health endpoint', async () => {
  const res = await req('GET', '/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.success, true);
});

test('register rejects invalid payload', async () => {
  const res = await req('POST', '/api/auth/register', { body: { name: 'A', email: 'bad', password: '123' } });
  assert.equal(res.status, 400);
  assert.equal(res.body.success, false);
});

test('register creates user with default categories', async () => {
  const res = await registerUser('Test User', 'test@example.com', 'secret123');
  assert.ok(res.token);
  assert.equal(res.user.email, 'test@example.com');
  assert.equal(res.user.password, undefined);
  token = res.token;
  userId = res.user._id;

  const cats = await req('GET', '/api/categories', { token });
  assert.equal(cats.status, 200);
  assert.equal(cats.body.categories.length, 16);
  assert.equal(cats.body.categories.filter((c) => c.type === 'expense').length, 10);
  assert.equal(cats.body.categories.filter((c) => c.type === 'income').length, 6);
});

test('duplicate registration is rejected', async () => {
  const res = await req('POST', '/api/auth/register', {
    body: { name: 'Test User', email: 'test@example.com', password: 'secret123' },
  });
  assert.equal(res.status, 409);
});

test('login works and bad credentials fail', async () => {
  const ok = await req('POST', '/api/auth/login', {
    body: { email: 'test@example.com', password: 'secret123' },
  });
  assert.equal(ok.status, 200);

  const bad = await req('POST', '/api/auth/login', {
    body: { email: 'test@example.com', password: 'wrongpass' },
  });
  assert.equal(bad.status, 401);
});

test('protected routes require auth', async () => {
  const res = await req('GET', '/api/auth/me');
  assert.equal(res.status, 401);
  const bad = await req('GET', '/api/auth/me', { token: 'not.a.token' });
  assert.equal(bad.status, 401);
});

test('GET /api/auth/me returns profile', async () => {
  const res = await req('GET', '/api/auth/me', { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.user.name, 'Test User');
  assert.equal(res.body.user.currency, 'INR');
});

test('create income and expense transactions', async () => {
  const income = await req('POST', '/api/transactions', {
    token,
    body: {
      type: 'income',
      amount: 50000,
      category: 'Salary',
      description: 'Monthly salary',
      date: '2026-01-05',
      paymentMethod: 'Bank Transfer',
    },
  });
  assert.equal(income.status, 201);

  const expense = await req('POST', '/api/transactions', {
    token,
    body: {
      type: 'expense',
      amount: 1200,
      category: 'Food',
      description: 'Dinner',
      date: '2026-01-06',
      paymentMethod: 'UPI',
    },
  });
  assert.equal(expense.status, 201);
  txId = expense.body.transaction._id;

  const expense2 = await req('POST', '/api/transactions', {
    token,
    body: {
      type: 'expense',
      amount: 800,
      category: 'Transport',
      description: 'Cab',
      date: '2026-01-07',
      paymentMethod: 'Card',
    },
  });
  assert.equal(expense2.status, 201);

  const invalid = await req('POST', '/api/transactions', {
    token,
    body: { type: 'expense', amount: -5, category: 'Food', date: '2026-01-06', paymentMethod: 'Cash' },
  });
  assert.equal(invalid.status, 400);
});

test('list transactions with filters, search, sort and pagination', async () => {
  const all = await req('GET', '/api/transactions?limit=2', { token });
  assert.equal(all.status, 200);
  assert.equal(all.body.transactions.length, 2);
  assert.equal(all.body.pagination.total, 3);
  assert.equal(all.body.pagination.totalPages, 2);

  const expenses = await req('GET', '/api/transactions?type=expense', { token });
  assert.equal(expenses.body.pagination.total, 2);

  const search = await req('GET', '/api/transactions?search=cab', { token });
  assert.equal(search.body.pagination.total, 1);

  const sorted = await req('GET', '/api/transactions?sort=amount&order=asc', { token });
  assert.equal(sorted.body.transactions[0].amount, 800);

  const range = await req('GET', '/api/transactions?from=2026-01-01&to=2026-01-06', { token });
  assert.equal(range.body.pagination.total, 2);

  const stats = await req('GET', '/api/transactions/stats', { token });
  assert.equal(stats.body.totals.income, 50000);
  assert.equal(stats.body.totals.expense, 2000);
});

test('update and delete a transaction', async () => {
  const upd = await req('PUT', `/api/transactions/${txId}`, {
    token,
    body: { amount: 1500, description: 'Dinner with friends' },
  });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.transaction.amount, 1500);

  const del = await req('DELETE', `/api/transactions/${txId}`, { token });
  assert.equal(del.status, 200);

  const gone = await req('GET', `/api/transactions/${txId}`, { token });
  assert.equal(gone.status, 404);
});

test('users cannot access each other data', async () => {
  const other = await registerUser('Other User', 'other@example.com', 'secret123');
  otherToken = other.token;
  otherUserId = other.user._id;

  const res = await req('GET', `/api/transactions?limit=100`, { token: otherToken });
  assert.equal(res.body.pagination.total, 0);

  const del = await req('DELETE', '/api/transactions/000000000000000000000000', { token: otherToken });
  assert.equal(del.status, 404);
});

test('category CRUD', async () => {
  const create = await req('POST', '/api/categories', {
    token,
    body: { name: 'Pets', type: 'expense', icon: 'PawPrint', color: '#a3e635' },
  });
  assert.equal(create.status, 201);
  categoryId = create.body.category._id;

  const dupe = await req('POST', '/api/categories', {
    token,
    body: { name: 'Pets', type: 'expense' },
  });
  assert.equal(dupe.status, 409);

  const upd = await req('PUT', `/api/categories/${categoryId}`, {
    token,
    body: { color: '#22c55e' },
  });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.category.color, '#22c55e');

  const list = await req('GET', '/api/categories?type=expense', { token });
  assert.equal(list.body.categories.some((c) => c.name === 'Pets'), true);
});

test('budget CRUD with spent calculation', async () => {
  const create = await req('POST', '/api/budgets', {
    token,
    body: { category: 'Overall', amount: 20000, month: 1, year: 2026 },
  });
  assert.equal(create.status, 201);
  budgetId = create.body.budget._id;

  const catBudget = await req('POST', '/api/budgets', {
    token,
    body: { category: 'Food', amount: 5000, month: 1, year: 2026 },
  });
  assert.equal(catBudget.status, 201);

  const dupe = await req('POST', '/api/budgets', {
    token,
    body: { category: 'Food', amount: 1000, month: 1, year: 2026 },
  });
  assert.equal(dupe.status, 409);

  const invalidCat = await req('POST', '/api/budgets', {
    token,
    body: { category: 'Not A Category', amount: 100, month: 1, year: 2026 },
  });
  assert.equal(invalidCat.status, 400);

  const list = await req('GET', '/api/budgets?month=1&year=2026', { token });
  assert.equal(list.status, 200);
  assert.equal(list.body.budgets.length, 2);
  const overall = list.body.budgets.find((b) => b.category === 'Overall');
  const food = list.body.budgets.find((b) => b.category === 'Food');
  assert.equal(overall.spent, 800);
  assert.equal(food.spent, 0);
  assert.equal(overall.percent, 4);
  assert.equal(overall.remaining, 19200);

  const upd = await req('PUT', `/api/budgets/${budgetId}`, { token, body: { amount: 30000 } });
  assert.equal(upd.status, 200);
  assert.equal(upd.body.budget.amount, 30000);
});

test('dashboard summary reflects real data', async () => {
  const now = new Date();
  const current = await req('POST', '/api/budgets', {
    token,
    body: { category: 'Overall', amount: 10000, month: now.getMonth() + 1, year: now.getFullYear() },
  });
  assert.equal(current.status, 201);

  const res = await req('GET', '/api/dashboard/summary?from=2026-01-01&to=2026-12-31', { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.totals.income, 50000);
  assert.equal(res.body.totals.expense, 800);
  assert.equal(res.body.totals.balance ?? res.body.totals.savings, 49200);
  assert.equal(res.body.recentTransactions.length >= 1, true);
  assert.equal(res.body.budgetProgress.length, 1);
  assert.equal(res.body.budgetProgress[0].spent, 0);
  assert.equal(res.body.activity.length, 14);

  const noAuth = await req('GET', '/api/dashboard/summary');
  assert.equal(noAuth.status, 401);
});

test('dashboard analytics returns chart data', async () => {
  const res = await req('GET', '/api/dashboard/analytics?from=2026-01-01&to=2026-12-31', { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.incomeVsExpense.length, 12);
  assert.equal(res.body.incomeVsExpense[0].income, 50000);
  assert.equal(res.body.categoryBreakdown.length >= 1, true);
  assert.equal(res.body.yearly.length, 1);
  assert.equal(typeof res.body.stats.avgDailyExpense, 'number');
  assert.equal(res.body.stats.highestCategory, 'Transport');

  const other = await req('GET', '/api/dashboard/analytics', { token: otherToken });
  assert.equal(other.body.stats.totalIncome, 0);
});

test('reports summary for CSV/PDF export', async () => {
  const res = await req('GET', '/api/reports/summary?from=2026-01-01&to=2026-12-31', { token });
  assert.equal(res.status, 200);
  assert.equal(res.body.totalIncome, 50000);
  assert.equal(res.body.totalExpenses, 800);
  assert.equal(res.body.savings, 49200);
  assert.ok(res.body.categoryBreakdown.length >= 2);
  assert.ok(res.body.paymentMethodBreakdown.length >= 1);
  assert.ok(res.body.daily.length >= 360);
  assert.ok(res.body.monthly.length >= 1);
});

test('profile update, currency and password change', async () => {
  const profile = await req('PUT', '/api/auth/profile', {
    token,
    body: { name: 'Renamed User', currency: 'USD' },
  });
  assert.equal(profile.status, 200);
  assert.equal(profile.body.user.currency, 'USD');

  const wrong = await req('PUT', '/api/auth/password', {
    token,
    body: { currentPassword: 'nope', newPassword: 'newsecret1' },
  });
  assert.equal(wrong.status, 401);

  const ok = await req('PUT', '/api/auth/password', {
    token,
    body: { currentPassword: 'secret123', newPassword: 'newsecret1' },
  });
  assert.equal(ok.status, 200);

  const login = await req('POST', '/api/auth/login', {
    body: { email: 'test@example.com', password: 'newsecret1' },
  });
  assert.equal(login.status, 200);
  token = login.body.token;
});

test('accounts CRUD with balances and net worth', async () => {
  const created = await req('POST', '/api/accounts', {
    token,
    body: { name: 'Test Bank', type: 'savings', openingBalance: 1000 },
  });
  assert.equal(created.status, 201);
  const accountId = created.body.account._id;

  const dupe = await req('POST', '/api/accounts', {
    token,
    body: { name: 'Test Bank', type: 'cash', openingBalance: 0 },
  });
  assert.equal(dupe.status, 409);

  const list = await req('GET', '/api/accounts', { token });
  assert.equal(list.status, 200);
  assert.equal(list.body.accounts.length, 1);
  assert.equal(list.body.accounts[0].balance, 1000);

  const tx = await req('POST', '/api/transactions', {
    token,
    body: {
      type: 'income',
      amount: 500,
      category: 'Salary',
      date: '2026-11-01',
      paymentMethod: 'Bank Transfer',
      accountId,
    },
  });
  assert.equal(tx.status, 201);
  assert.equal(tx.body.transaction.accountId, accountId);

  const afterFlow = await req('GET', '/api/accounts', { token });
  assert.equal(afterFlow.body.accounts[0].balance, 1500);
  assert.equal(afterFlow.body.netWorth, 1500);

  const history = await req('GET', '/api/accounts/net-worth?months=6', { token });
  assert.equal(history.status, 200);
  assert.equal(history.body.points.length, 6);

  const filtered = await req('GET', `/api/transactions?accountId=${accountId}`, { token });
  assert.equal(filtered.body.transactions.length, 1);

  const del = await req('DELETE', `/api/accounts/${accountId}`, { token });
  assert.equal(del.status, 409);

  await req('DELETE', `/api/transactions/${tx.body.transaction._id}`, { token });
  const del2 = await req('DELETE', `/api/accounts/${accountId}`, { token });
  assert.equal(del2.status, 200);
});

test('split transactions validate and roll into category analytics', async () => {
  const split = await req('POST', '/api/transactions', {
    token,
    body: {
      type: 'expense',
      amount: 300,
      date: '2026-11-02',
      paymentMethod: 'UPI',
      splits: [
        { category: 'Food', amount: 200 },
        { category: 'Shopping', amount: 100 },
      ],
    },
  });
  assert.equal(split.status, 201);
  assert.equal(split.body.transaction.category, 'Split');
  const splitId = split.body.transaction._id;

  const badSplit = await req('POST', '/api/transactions', {
    token,
    body: {
      type: 'expense',
      amount: 300,
      date: '2026-11-02',
      paymentMethod: 'UPI',
      splits: [
        { category: 'Food', amount: 100 },
        { category: 'Shopping', amount: 100 },
      ],
    },
  });
  assert.equal(badSplit.status, 400);

  const list = await req('GET', '/api/transactions?category=Split', { token });
  assert.equal(list.status, 200);
  assert.equal(list.body.transactions.length, 1);

  const reports = await req('GET', '/api/reports/summary?from=2026-11-01&to=2026-11-30', { token });
  assert.equal(reports.status, 200);
  const food = reports.body.categoryBreakdown.find((c) => c.category === 'Food');
  const shopping = reports.body.categoryBreakdown.find((c) => c.category === 'Shopping');
  assert.ok(food.amount >= 200);
  assert.ok(shopping.amount >= 100);
  const splitRow = reports.body.categoryBreakdown.find((c) => c.category === 'Split');
  assert.ok(!splitRow || splitRow.amount === 0);

  const unsplit = await req('PUT', `/api/transactions/${splitId}`, {
    token,
    body: {
      splits: null,
      category: 'Food',
      amount: 300,
      type: 'expense',
      date: '2026-11-02',
      paymentMethod: 'UPI',
    },
  });
  assert.equal(unsplit.status, 200);
  assert.equal(unsplit.body.transaction.category, 'Food');
  assert.equal(unsplit.body.transaction.splits, undefined);

  await req('DELETE', `/api/transactions/${splitId}`, { token });
});

test('household create, join, shared budgets and membership rules', async () => {
  const created = await req('POST', '/api/households', { token, body: { name: 'Family Home' } });
  assert.equal(created.status, 201);
  assert.equal(created.body.household.members.length, 1);
  assert.ok(created.body.household.joinCode.length >= 6);
  const joinCode = created.body.household.joinCode;
  const householdId = created.body.household._id;

  const noInvite = await req('POST', '/api/households/invite', {
    token,
    body: { email: 'ghost@example.com' },
  });
  assert.equal(noInvite.status, 404);

  // non-member cannot create budgets for this household
  const otherCannotEdit = await req('POST', '/api/budgets', {
    token: otherToken,
    body: { category: 'Bills', amount: 1000, month: 11, year: 2026, householdId },
  });
  assert.equal(otherCannotEdit.status, 403);

  const invited = await req('POST', '/api/households/invite', {
    token,
    body: { email: 'other@example.com' },
  });
  assert.equal(invited.status, 200);
  assert.equal(invited.body.household.members.length, 2);

  const shared = await req('POST', '/api/budgets', {
    token,
    body: { category: 'Food', amount: 5000, month: 11, year: 2026, householdId },
  });
  assert.equal(shared.status, 201);
  assert.equal(shared.body.budget.householdId, householdId);

  const otherList = await req('GET', '/api/budgets?month=11&year=2026', { token: otherToken });
  assert.equal(otherList.status, 200);
  assert.ok(otherList.body.budgets.some((b) => b.householdId));

  const leave = await req('DELETE', `/api/households/members/${otherUserId}`, { token: otherToken });
  assert.equal(leave.status, 200);

  const rejoin = await req('POST', '/api/households/join', { token: otherToken, body: { joinCode } });
  assert.equal(rejoin.status, 200);

  const sharedList = await req('GET', '/api/budgets?month=11&year=2026', { token: otherToken });
  const sharedFood = sharedList.body.budgets.find((b) => b._id === shared.body.budget._id);
  assert.ok(sharedFood);
  assert.equal(typeof sharedFood.spent, 'number');

  const deleteH = await req('DELETE', '/api/households', { token });
  assert.equal(deleteH.status, 200);
  const gone = await req('GET', '/api/budgets?month=11&year=2026', { token });
  assert.ok(!gone.body.budgets.some((b) => b._id === shared.body.budget._id));
});

test('unknown routes return 404 and invalid ids return 400', async () => {
  const nf = await req('GET', '/api/nope');
  assert.equal(nf.status, 404);
  const badId = await req('GET', '/api/transactions/not-an-id', { token });
  assert.equal(badId.status, 400);
});
