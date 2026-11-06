const { z } = require('zod');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id');
const paramsSchema = z.object({ id: objectId });

const bodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(60),
  type: z.enum(['income', 'expense']),
  icon: z.string().trim().max(60).optional().default('Tag'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Color must be a hex value like #64748b')
    .optional()
    .default('#64748b'),
});

const updateSchema = bodySchema.partial().refine((d) => Object.keys(d).length > 0, {
  message: 'No fields to update',
});

// GET /api/categories?type=
const list = asyncHandler(async (req, res) => {
  const query = { userId: req.user._id };
  if (req.valid.query.type) query.type = req.valid.query.type;
  const categories = await Category.find(query).sort({ type: 1, name: 1 }).lean();
  res.json({ success: true, categories });
});

// POST /api/categories
const create = asyncHandler(async (req, res) => {
  const data = req.valid.body;
  const dupe = await Category.findOne({
    userId: req.user._id,
    name: data.name,
    type: data.type,
  });
  if (dupe) throw new ApiError(409, `A ${data.type} category named "${data.name}" already exists.`);
  const category = await Category.create({ ...data, userId: req.user._id });
  res.status(201).json({ success: true, message: 'Category created.', category });
});

// PUT /api/categories/:id
const update = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ _id: req.params.id, userId: req.user._id });
  if (!category) throw new ApiError(404, 'Category not found.');
  const data = req.valid.body;
  if (data.name && (data.name !== category.name || data.type !== category.type)) {
    const dupe = await Category.findOne({
      userId: req.user._id,
      name: data.name ?? category.name,
      type: data.type ?? category.type,
      _id: { $ne: category._id },
    });
    if (dupe) throw new ApiError(409, 'A category with that name already exists.');
  }
  Object.assign(category, data);
  await category.save();
  res.json({ success: true, message: 'Category updated.', category });
});

// DELETE /api/categories/:id
const remove = asyncHandler(async (req, res) => {
  const category = await Category.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!category) throw new ApiError(404, 'Category not found.');
  res.json({ success: true, message: 'Category deleted.', category });
});

module.exports = { list, create, update, remove, schemas: { bodySchema, updateSchema, objectId, paramsSchema } };
