const express = require('express');
const controller = require('../controllers/householdController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();
const { createSchema, joinSchema, inviteSchema } = controller.schemas;

const userIdSchema = require('zod').object({
  userId: require('zod').string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid id'),
});

router.use(protect);

router.get('/', controller.getMine);
router.post('/', validate(createSchema), controller.create);
router.post('/join', validate(joinSchema), controller.join);
router.post('/invite', validate(inviteSchema), controller.invite);
router.delete('/members/:userId', validate(userIdSchema, 'params'), controller.removeMember);
router.delete('/', controller.removeHousehold);

module.exports = router;
