const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
});

const { registerSchema, loginSchema, profileSchema, passwordSchema } = controller.schemas;

router.post('/register', authLimiter, validate(registerSchema), controller.register);
router.post('/login', authLimiter, validate(loginSchema), controller.login);
router.get('/me', protect, controller.me);
router.put('/profile', protect, validate(profileSchema), controller.updateProfile);
router.put('/password', protect, validate(passwordSchema), controller.changePassword);

module.exports = router;
