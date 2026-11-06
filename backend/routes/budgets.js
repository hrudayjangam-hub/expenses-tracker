const express = require('express');
const controller = require('../controllers/budgetController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();
const { budgetBody, listQuery, paramsSchema } = controller.schemas;

router.use(protect);

router.get('/', validate(listQuery, 'query'), controller.list);
router.get('/overview', controller.overview);
router.post('/', validate(budgetBody), controller.create);
router.put('/:id', validate(paramsSchema, 'params'), validate(budgetBody.partial()), controller.update);
router.delete('/:id', validate(paramsSchema, 'params'), controller.remove);

module.exports = router;
