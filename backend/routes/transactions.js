const express = require('express');
const controller = require('../controllers/transactionController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();
const { createSchema, updateSchema, listQuerySchema, paramsSchema } = controller.schemas;

router.use(protect);

router.get('/', validate(listQuerySchema, 'query'), controller.list);
router.get('/stats', validate(listQuerySchema, 'query'), controller.stats);
router.get('/:id', validate(paramsSchema, 'params'), controller.getOne);
router.post('/', validate(createSchema), controller.create);
router.put('/:id', validate(paramsSchema, 'params'), validate(updateSchema), controller.update);
router.delete('/:id', validate(paramsSchema, 'params'), controller.remove);

module.exports = router;
