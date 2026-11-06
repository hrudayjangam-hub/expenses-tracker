const express = require('express');
const controller = require('../controllers/categoryController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { z } = require('zod');

const router = express.Router();
const { bodySchema, updateSchema, paramsSchema } = controller.schemas;
const listQuery = z.object({ type: z.enum(['income', 'expense']).optional() });

router.use(protect);

router.get('/', validate(listQuery, 'query'), controller.list);
router.post('/', validate(bodySchema), controller.create);
router.put('/:id', validate(paramsSchema, 'params'), validate(updateSchema), controller.update);
router.delete('/:id', validate(paramsSchema, 'params'), controller.remove);

module.exports = router;
