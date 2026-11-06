const mongoose = require('mongoose');
const crypto = require('crypto');

const memberSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const householdSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Household name is required'],
      trim: true,
      maxlength: 60,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    joinCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      minlength: 6,
      maxlength: 8,
    },
    members: {
      type: [memberSchema],
      validate: [(v) => v.length >= 1, 'A household needs at least one member'],
    },
  },
  { timestamps: true }
);

householdSchema.statics.generateJoinCode = function generateJoinCode() {
  return crypto.randomBytes(5).toString('hex').slice(0, 6).toUpperCase();
};

module.exports = mongoose.model('Household', householdSchema);
