const jwt = require('jsonwebtoken');
const { z } = require('zod');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { seedDefaultCategories } = require('../utils/seed');

const signToken = (userId) =>
  jwt.sign({ id: String(userId) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Please provide a valid email').max(120),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Please provide a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const profileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  currency: z
    .enum([
      'INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'AUD', 'CAD', 'SGD',
      'CNY', 'CHF', 'KRW', 'BRL', 'ZAR', 'MYR', 'THB', 'PKR', 'BDT', 'NGN',
    ])
    .optional(),
  language: z.enum(['en', 'hi', 'te', 'es']).optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100),
});

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.valid.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const user = await User.create({ name, email, password });
  await seedDefaultCategories(user._id);

  res.status(201).json({
    success: true,
    message: 'Account created successfully.',
    token: signToken(user._id),
    user,
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.valid.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  res.status(200).json({
    success: true,
    message: 'Logged in successfully.',
    token: signToken(user._id),
    user,
  });
});

// GET /api/auth/me
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

// PUT /api/auth/profile
const updateProfile = asyncHandler(async (req, res) => {
  const updates = req.valid.body;
  if (updates.name) req.user.name = updates.name;
  if (updates.currency) req.user.currency = updates.currency;
  if (updates.language) req.user.language = updates.language;
  await req.user.save();
  res.json({ success: true, message: 'Profile updated.', user: req.user });
});

// PUT /api/auth/password
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.valid.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(401, 'Current password is incorrect.');
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully.' });
});

module.exports = {
  register,
  login,
  me,
  updateProfile,
  changePassword,
  schemas: { registerSchema, loginSchema, profileSchema, passwordSchema },
};
