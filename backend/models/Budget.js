const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    category: {
      type: String,
      required: [true, 'Budget category is required'],
      trim: true,
      maxlength: 60,
    },
    amount: {
      type: Number,
      required: [true, 'Budget amount is required'],
      min: [1, 'Budget amount must be at least 1'],
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
      min: 2000,
      max: 2100,
    },
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Household',
      default: null,
      index: true,
    },
    alertedThresholds: {
      type: [Number],
      default: [],
    },
  },
  { timestamps: true }
);

budgetSchema.index(
  { userId: 1, category: 1, month: 1, year: 1 },
  { unique: true, partialFilterExpression: { householdId: null } }
);
budgetSchema.index(
  { householdId: 1, category: 1, month: 1, year: 1 },
  { unique: true, partialFilterExpression: { householdId: { $type: 'objectId' } } }
);

module.exports = mongoose.model('Budget', budgetSchema);
