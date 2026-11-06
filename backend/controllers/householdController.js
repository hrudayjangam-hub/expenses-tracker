const { z } = require('zod');
const Household = require('../models/Household');
const User = require('../models/User');
const Budget = require('../models/Budget');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const createSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60),
});

const joinSchema = z.object({
  joinCode: z.string().trim().min(6).max(8).toUpperCase(),
});

const inviteSchema = z.object({
  email: z.string().trim().email('Enter a valid email address').toLowerCase(),
});

const memberView = async (members) => {
  const users = await User.find({ _id: { $in: members.map((m) => m.userId) } })
    .select('name email')
    .lean();
  const byId = Object.fromEntries(users.map((u) => [String(u._id), u]));
  return members.map((m) => ({
    userId: m.userId,
    role: m.role,
    joinedAt: m.joinedAt,
    name: byId[String(m.userId)]?.name || 'Unknown',
    email: byId[String(m.userId)]?.email || '',
  }));
};

const shape = async (h) => ({
  _id: h._id,
  name: h.name,
  joinCode: h.joinCode,
  ownerId: h.ownerId,
  createdAt: h.createdAt,
  members: await memberView(h.members),
});

const myHousehold = (userId) => Household.findOne({ 'members.userId': userId });

// GET /api/households
const getMine = asyncHandler(async (req, res) => {
  const h = await myHousehold(req.user._id);
  res.json({ success: true, household: h ? await shape(h) : null });
});

// POST /api/households
const create = asyncHandler(async (req, res) => {
  const existing = await myHousehold(req.user._id);
  if (existing) throw new ApiError(409, 'You already belong to a household. Leave it first.');

  let joinCode = Household.generateJoinCode();
  // extremely unlikely collision — retry a few times
  for (let i = 0; i < 5; i += 1) {
    // eslint-disable-next-line no-await-in-loop
    const clash = await Household.findOne({ joinCode });
    if (!clash) break;
    joinCode = Household.generateJoinCode();
  }

  const h = await Household.create({
    name: req.valid.body.name,
    ownerId: req.user._id,
    joinCode,
    members: [{ userId: req.user._id, role: 'owner' }],
  });
  res.status(201).json({ success: true, message: 'Household created.', household: await shape(h) });
});

// POST /api/households/join
const join = asyncHandler(async (req, res) => {
  const { joinCode } = req.valid.body;
  const h = await Household.findOne({ joinCode });
  if (!h) throw new ApiError(404, 'No household found with that code.');
  if (h.members.some((m) => String(m.userId) === String(req.user._id))) {
    throw new ApiError(409, 'You are already a member of this household.');
  }
  const existing = await myHousehold(req.user._id);
  if (existing) throw new ApiError(409, 'Leave your current household before joining another.');

  h.members.push({ userId: req.user._id, role: 'member' });
  await h.save();
  res.json({ success: true, message: `Joined ${h.name}.`, household: await shape(h) });
});

// POST /api/households/invite — adds an existing user by email
const invite = asyncHandler(async (req, res) => {
  const h = await Household.findOne({ 'members.userId': req.user._id });
  if (!h) throw new ApiError(404, 'Create a household first.');
  if (String(h.ownerId) !== String(req.user._id)) {
    throw new ApiError(403, 'Only the household owner can invite members.');
  }

  const target = await User.findOne({ email: req.valid.body.email });
  if (!target) throw new ApiError(404, 'No account found with that email. Share the join code instead.');
  if (h.members.some((m) => String(m.userId) === String(target._id))) {
    throw new ApiError(409, 'That person is already a member.');
  }
  const other = await myHousehold(target._id);
  if (other) throw new ApiError(409, 'That person already belongs to another household.');

  h.members.push({ userId: target._id, role: 'member' });
  await h.save();
  res.json({ success: true, message: `${target.name} joined ${h.name}.`, household: await shape(h) });
});

// DELETE /api/households/members/:userId — owner removes, or self-leave
const removeMember = asyncHandler(async (req, res) => {
  const h = await Household.findOne({ 'members.userId': req.user._id });
  if (!h) throw new ApiError(404, 'Household not found.');
  const targetId = req.params.userId;
  const isSelf = String(targetId) === String(req.user._id);
  const isOwner = String(h.ownerId) === String(req.user._id);

  if (!isSelf && !isOwner) throw new ApiError(403, 'Only the owner can remove other members.');
  if (targetId === String(h.ownerId) && !isSelf) {
    throw new ApiError(400, 'The owner cannot be removed. Transfer or delete the household.');
  }

  if (isSelf && isOwner && h.members.length > 1) {
    throw new ApiError(400, 'You own this household. Delete it or hand over ownership first.');
  }

  h.members = h.members.filter((m) => String(m.userId) !== targetId);
  if (!h.members.length) {
    await Household.deleteOne({ _id: h._id });
    await Budget.deleteMany({ householdId: h._id });
    return res.json({ success: true, message: 'Household deleted.', household: null });
  }
  if (isSelf) {
    await Budget.updateMany({ householdId: h._id }, { $pull: { alertedThresholds: { $exists: true } } });
  }
  await h.save();
  return res.json({ success: true, message: 'Member removed.', household: await shape(h) });
});

// DELETE /api/households — owner deletes the whole household
const removeHousehold = asyncHandler(async (req, res) => {
  const h = await Household.findOne({ 'members.userId': req.user._id });
  if (!h) throw new ApiError(404, 'Household not found.');
  if (String(h.ownerId) !== String(req.user._id)) throw new ApiError(403, 'Only the owner can delete the household.');
  await Household.deleteOne({ _id: h._id });
  await Budget.deleteMany({ householdId: h._id });
  res.json({ success: true, message: 'Household deleted.', household: null });
});

module.exports = {
  getMine,
  create,
  join,
  invite,
  removeMember,
  removeHousehold,
  myHousehold,
  schemas: { createSchema, joinSchema, inviteSchema },
};
