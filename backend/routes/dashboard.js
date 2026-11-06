const express = require('express');
const controller = require('../controllers/dashboardController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();
const { querySchema } = controller.schemas;

router.use(protect);

router.get('/summary', validate(querySchema, 'query'), controller.summary);
router.get('/analytics', validate(querySchema, 'query'), controller.analytics);

module.exports = router;
