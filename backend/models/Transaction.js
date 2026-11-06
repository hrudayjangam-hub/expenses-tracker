const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: {
        values: ['income', 'expense'],
        message: 'Type must be income or expense',
      },
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
      max: [100000000000, 'Amount is too large'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: '',
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      default: Date.now,
    },
    paymentMethod: {
      type: String,
      required: [true, 'Payment method is required'],
      enum: {
        values: ['Cash', 'UPI', 'Bank Transfer', 'Card', 'Other'],
        message: 'Invalid payment method',
      },
      default: 'Cash',
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      default: null,
      index: true,
    },
    splits: {
      type: [
        {
          _id: false,
          category: {
            type: String,
            required: true,
            trim: true,
            maxlength: 60,
          },
          amount: {
            type: Number,
            required: true,
            min: 0.01,
          },
        },
      ],
      default: undefined,
      validate: [
        (v) => !v || (v.length >= 2 && v.length <= 10),
        'A split needs between 2 and 10 parts',
      ],
    },
  },
  { timestamps: true }
);

transactionSchema.pre('validate', function validateSplits(next) {
  if (this.splits && this.splits.length) {
    const sum = this.splits.reduce((s, p) => s + Number(p.amount), 0);
    const fail = (message) => {
      const err = new mongoose.Error.ValidationError();
      err.addError(
        'splits',
        new mongoose.Error.ValidatorError({ message, path: 'splits', value: this.splits })
      );
      next(err);
    };
    if (Math.abs(sum - this.amount) > 0.01) {
      return fail('Split amounts must add up to the transaction amount.');
    }
    const cats = this.splits.map((p) => p.category);
    if (new Set(cats).size !== cats.length) {
      return fail('Each split needs a different category.');
    }
    this.category = 'Split';
  }
  return next();
});

transactionSchema.index({ userId: 1, date: -1 });
transactionSchema.index({ userId: 1, type: 1, date: -1 });
transactionSchema.index({ userId: 1, category: 1, date: -1 });
transactionSchema.index({ userId: 1, paymentMethod: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
