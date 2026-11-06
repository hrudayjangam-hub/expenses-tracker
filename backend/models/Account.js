const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Account name is required'],
      trim: true,
      maxlength: 40,
    },
    type: {
      type: String,
      required: true,
      enum: ['checking', 'savings', 'cash', 'wallet', 'credit'],
      default: 'checking',
    },
    openingBalance: {
      type: Number,
      default: 0,
      min: -100000000000,
      max: 100000000000,
    },
    color: {
      type: String,
      default: '#10b981',
      match: [/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #64748b'],
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

accountSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Account', accountSchema);
