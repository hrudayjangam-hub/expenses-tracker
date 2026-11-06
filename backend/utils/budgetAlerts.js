const Budget = require('../models/Budget');
const Household = require('../models/Household');
const User = require('../models/User');
const { sendMail } = require('./mailer');
const { computeSpent } = require('../controllers/budgetController');
const { round2 } = require('./date');

const THRESHOLDS = [90, 100];

const money = (n, currency) => {
  try {
    return new Intl.NumberFormat('en', { style: 'currency', currency }).format(n);
  } catch {
    return `${currency} ${round2(n)}`;
  }
};

/**
 * Checks the user's current-month budgets (personal + household) and emails
 * each member once per threshold (90% / 100%). Fire-and-forget friendly.
 */
const checkBudgetAlerts = async (user) => {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const households = await Household.find({ 'members.userId': user._id }).select('_id').lean();
  const hids = households.map((h) => h._id);

  const budgets = await Budget.find({
    $or: [{ userId: user._id, householdId: null }, { householdId: { $in: hids } }],
    month,
    year,
  }).lean();

  if (!budgets.length) return;

  const enriched = await computeSpent(user._id, budgets);

  for (const b of enriched) {
    if (b.percent < 90) continue;
    const threshold = b.percent >= 100 ? 100 : 90;
    if ((b.alertedThresholds || []).includes(threshold)) continue;

    let recipients;
    if (b.householdId) {
      const h = await Household.findById(b.householdId).lean();
      if (!h) continue;
      const ids = h.members.map((m) => m.userId);
      recipients = await User.find({ _id: { $in: ids } }).select('email name').lean();
    } else {
      recipients = [{ email: user.email, name: user.name }];
    }

    const subject =
      threshold === 100
        ? `Budget exceeded: ${b.category} is over its ${money(b.amount, 'INR')} limit`
        : `Budget alert: ${b.category} is at ${b.percent}% of its limit`;

    const html = `
      <div style="font-family:Segoe UI,Arial,sans-serif;max-width:520px;margin:auto;color:#0f172a">
        <h2 style="color:${threshold === 100 ? '#e11d48' : '#d97706'}">${threshold === 100 ? 'Budget exceeded' : 'Budget warning'}</h2>
        <p><strong>${b.category}</strong> is at <strong>${b.percent}%</strong> of its monthly limit.</p>
        <table style="border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:6px 16px 6px 0">Limit</td><td style="font-weight:700">${money(b.amount, 'INR')}</td></tr>
          <tr><td style="padding:6px 16px 6px 0">Spent</td><td style="font-weight:700">${money(b.spent, 'INR')}</td></tr>
          <tr><td style="padding:6px 16px 6px 0">Remaining</td><td style="font-weight:700">${money(b.remaining, 'INR')}</td></tr>
        </table>
        <p style="color:#64748b;font-size:13px">Open your dashboard to review this budget: ${process.env.CLIENT_URL || ''}</p>
      </div>`;

    await Promise.all(
      recipients.map((r) =>
        sendMail({ to: r.email, subject, html, text: `${b.category}: ${b.percent}% of limit used.` })
      )
    );

    await Budget.updateOne(
      { _id: b._id },
      { $addToSet: { alertedThresholds: threshold } }
    );
  }
};

module.exports = { checkBudgetAlerts, THRESHOLDS };
