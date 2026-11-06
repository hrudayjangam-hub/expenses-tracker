/**
 * Offline "AI" category suggestion engine.
 * Scores a description against keyword rules for each known category and
 * returns { category, confidence } or null. Confidence 0..1.
 */

const EXPENSE_RULES = [
  { category: 'Food', keywords: ['swiggy', 'zomato', 'restaurant', 'cafe', 'coffee', 'pizza', 'burger', 'lunch', 'dinner', 'breakfast', 'eatery', 'dhaba', 'food'] },
  { category: 'Groceries', keywords: ['grocery', 'groceries', 'supermarket', 'bigbasket', 'blinkit', 'zepto', 'instamart', 'dmart', 'vegetables', 'fruits', 'milk', 'pantry', 'kirana'] },
  { category: 'Transport', keywords: ['uber', 'ola', 'rapido', 'petrol', 'diesel', 'fuel', 'metro', 'bus', 'train', 'auto', 'cab', 'taxi', 'parking', 'toll'] },
  { category: 'Shopping', keywords: ['amazon', 'flipkart', 'myntra', 'ajio', 'mall', 'clothes', 'shoes', 'electronics', 'purchase', 'order'] },
  { category: 'Bills', keywords: ['electricity', 'recharge', 'broadband', 'wifi', 'internet', 'bill', 'water', 'gas', 'maintenance', 'rent', 'emi', 'subscription'] },
  { category: 'Entertainment', keywords: ['netflix', 'spotify', 'movie', 'cinema', 'theatre', 'concert', 'game', 'steam', 'prime', 'hotstar', 'show'] },
  { category: 'Healthcare', keywords: ['pharmacy', 'hospital', 'doctor', 'medicine', 'clinic', 'medical', 'consultation', 'lab', 'checkup'] },
  { category: 'Travel', keywords: ['flight', 'airline', 'hotel', 'booking', 'makemytrip', 'irctc', 'trip', 'vacation', 'resort', 'oya', 'airbnb'] },
  { category: 'Education', keywords: ['course', 'udemy', 'tuition', 'school', 'college', 'exam', 'fee', 'book', 'training', 'certification'] },
];

const INCOME_RULES = [
  { category: 'Salary', keywords: ['salary', 'payroll', 'stipend', 'wage', 'paycheck'] },
  { category: 'Freelancing', keywords: ['freelance', 'upwork', 'fiverr', 'client', 'project payment', 'gig'] },
  { category: 'Business', keywords: ['invoice', 'revenue', 'sales', 'profit', 'business'] },
  { category: 'Gifts', keywords: ['gift', 'birthday', 'present', 'bonus'] },
  { category: 'Allowance', keywords: ['allowance', 'pocket money'] },
];

const score = (text, keywords) => {
  let s = 0;
  keywords.forEach((k) => {
    if (text.includes(k)) s += k.length >= 5 ? 2 : 1;
  });
  return s;
};

/**
 * @param {string} description
 * @param {{name: string, type: string}[]} categories user's categories
 * @param {'income'|'expense'} type
 * @returns {{category: string, confidence: number}|null}
 */
export function suggestCategory(description, categories, type = 'expense') {
  const text = (description || '').toLowerCase().trim();
  if (text.length < 3) return null;

  const rules = type === 'income' ? INCOME_RULES : EXPENSE_RULES;
  const names = new Set(categories.filter((c) => c.type === type).map((c) => c.name));

  let best = null;
  let bestScore = 0;
  rules.forEach((rule) => {
    if (!names.has(rule.category)) return;
    const s = score(text, rule.keywords);
    if (s > bestScore) {
      bestScore = s;
      best = rule.category;
    }
  });

  if (!best) return null;
  return { category: best, confidence: Math.min(1, bestScore / 6) };
}

export default suggestCategory;
