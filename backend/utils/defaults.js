const EXPENSE_CATEGORIES = [
  { name: 'Food', icon: 'UtensilsCrossed', color: '#f97316' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#ec4899' },
  { name: 'Transport', icon: 'Car', color: '#0ea5e9' },
  { name: 'Education', icon: 'GraduationCap', color: '#6366f1' },
  { name: 'Entertainment', icon: 'Clapperboard', color: '#a855f7' },
  { name: 'Healthcare', icon: 'HeartPulse', color: '#ef4444' },
  { name: 'Bills', icon: 'Receipt', color: '#eab308' },
  { name: 'Travel', icon: 'Plane', color: '#14b8a6' },
  { name: 'Groceries', icon: 'ShoppingCart', color: '#84cc16' },
  { name: 'Other', icon: 'Tag', color: '#64748b' },
];

const INCOME_CATEGORIES = [
  { name: 'Salary', icon: 'Briefcase', color: '#10b981' },
  { name: 'Freelancing', icon: 'Laptop', color: '#06b6d4' },
  { name: 'Business', icon: 'Building2', color: '#3b82f6' },
  { name: 'Allowance', icon: 'Wallet', color: '#f59e0b' },
  { name: 'Gifts', icon: 'Gift', color: '#f43f5e' },
  { name: 'Other', icon: 'Tag', color: '#64748b' },
];

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'];

module.exports = { EXPENSE_CATEGORIES, INCOME_CATEGORIES, PAYMENT_METHODS };
