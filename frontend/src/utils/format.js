const CURRENCY_SYMBOLS = { INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$' };

export const CURRENCIES = [
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'AED', label: 'UAE Dirham (د.إ)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
  { code: 'AUD', label: 'Australian Dollar (A$)' },
  { code: 'CAD', label: 'Canadian Dollar (C$)' },
  { code: 'SGD', label: 'Singapore Dollar (S$)' },
];

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'];

export const formatCurrency = (amount, currency = 'INR', { compact = false } = {}) => {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: compact ? 1 : 2,
      notation: compact ? 'compact' : 'standard',
    }).format(value);
  } catch {
    const sym = CURRENCY_SYMBOLS[currency] || '';
    return `${sym}${value.toFixed(2)}`;
  }
};

export const formatNumber = (n, digits = 0) =>
  new Intl.NumberFormat('en-US', { maximumFractionDigits: digits }).format(Number(n) || 0);

const toDate = (d) => (d instanceof Date ? d : new Date(d));

export const formatDate = (d, opts = { day: '2-digit', month: 'short', year: 'numeric' }) =>
  toDate(d).toLocaleDateString('en-GB', opts);

export const formatTime = (d) =>
  toDate(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

export const toISODate = (d) => {
  const x = toDate(d);
  const p = (n) => String(n).padStart(2, '0');
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}`;
};

export const relativeDay = (d) => {
  const date = toDate(d);
  const today = new Date();
  const diff = Math.round((new Date(toISODate(today)) - new Date(toISODate(date))) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff === -1) return 'Tomorrow';
  return formatDate(date);
};

export const monthName = (m, y) =>
  new Date(y, m - 1, 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

export const daysBetween = (from, to) =>
  Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1);
