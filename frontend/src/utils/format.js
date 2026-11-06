const CURRENCY_SYMBOLS = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', JPY: '¥', AUD: 'A$', CAD: 'C$', SGD: 'S$',
  CNY: '¥', CHF: 'CHF', KRW: '₩', BRL: 'R$', ZAR: 'R', MYR: 'RM', THB: '฿', PKR: '₨', BDT: '৳', NGN: '₦',
};

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
  { code: 'CNY', label: 'Chinese Yuan (¥)' },
  { code: 'CHF', label: 'Swiss Franc (CHF)' },
  { code: 'KRW', label: 'South Korean Won (₩)' },
  { code: 'BRL', label: 'Brazilian Real (R$)' },
  { code: 'ZAR', label: 'South African Rand (R)' },
  { code: 'MYR', label: 'Malaysian Ringgit (RM)' },
  { code: 'THB', label: 'Thai Baht (฿)' },
  { code: 'PKR', label: 'Pakistani Rupee (₨)' },
  { code: 'BDT', label: 'Bangladeshi Taka (৳)' },
  { code: 'NGN', label: 'Nigerian Naira (₦)' },
];

export const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'];

const CURRENCY_LOCALES = {
  INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', AED: 'ar-AE', JPY: 'ja-JP',
  AUD: 'en-AU', CAD: 'en-CA', SGD: 'en-SG', CNY: 'zh-CN', CHF: 'de-CH', KRW: 'ko-KR',
  BRL: 'pt-BR', ZAR: 'en-ZA', MYR: 'ms-MY', THB: 'th-TH', PKR: 'ur-PK', BDT: 'bn-BD', NGN: 'en-NG',
};

let activeLocale = 'en-GB';
export const setFormatLocale = (tag) => {
  activeLocale = tag || 'en-GB';
};

export const formatCurrency = (amount, currency = 'INR', { compact = false } = {}) => {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(CURRENCY_LOCALES[currency] || activeLocale, {
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
  new Intl.NumberFormat(activeLocale, { maximumFractionDigits: digits }).format(Number(n) || 0);

const toDate = (d) => (d instanceof Date ? d : new Date(d));

export const formatDate = (d, opts = { day: '2-digit', month: 'short', year: 'numeric' }) =>
  toDate(d).toLocaleDateString(activeLocale, opts);

export const formatTime = (d) =>
  toDate(d).toLocaleTimeString(activeLocale, { hour: '2-digit', minute: '2-digit' });

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
  new Date(y, m - 1, 1).toLocaleDateString(activeLocale, { month: 'long', year: 'numeric' });

export const daysBetween = (from, to) =>
  Math.max(1, Math.round((new Date(to) - new Date(from)) / 86400000) + 1);
