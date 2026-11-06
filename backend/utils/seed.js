const Category = require('../models/Category');
const { EXPENSE_CATEGORIES, INCOME_CATEGORIES } = require('./defaults');

/** Seeds the default income/expense categories for a newly registered user. */
const seedDefaultCategories = async (userId) => {
  const docs = [
    ...EXPENSE_CATEGORIES.map((c) => ({ ...c, type: 'expense', isDefault: true })),
    ...INCOME_CATEGORIES.map((c) => ({ ...c, type: 'income', isDefault: true })),
  ].map((c) => ({ ...c, userId }));

  try {
    await Category.insertMany(docs, { ordered: false });
  } catch (err) {
    if (err.code !== 11000) throw err;
  }
};

module.exports = { seedDefaultCategories };
