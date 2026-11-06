const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Category name is required'],
      trim: true,
      maxlength: 60,
    },
    type: {
      type: String,
      required: true,
      enum: ['income', 'expense'],
    },
    icon: {
      type: String,
      default: 'Tag',
      maxlength: 60,
    },
    color: {
      type: String,
      default: '#64748b',
      match: [/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #64748b'],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

categorySchema.index({ userId: 1, name: 1, type: 1 }, { unique: true });

module.exports = mongoose.model('Category', categorySchema);
