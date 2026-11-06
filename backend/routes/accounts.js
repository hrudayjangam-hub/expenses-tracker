const express = require('express');
const controller = require('../controllers/accountController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();
const { accountBody, paramsSchema } = controller.schemas;

router.use(protect);

router.get('/', controller.list);
router.get('/net-worth', controller.netWorthHistory);
router.post('/', validate(accountBody), controller.create);
router.put('/:id', validate(paramsSchema, 'params'), validate(accountBody.partial()), controller.update);
router.delete('/:id', validate(paramsSchema, 'params'), controller.remove);

module.exports = router;
