import { Router } from 'express';
import { body } from 'express-validator';
import { loginLimiter, authLimiter } from '../utils/rateLimiters.js';
import { validate } from '../middlewares/validate.js';
import { authenticate } from '../middlewares/auth.js';
import { login, refresh, logout, requestPasswordReset, resetPassword, me, register } from '../controllers/authController.js';

const router = Router();

router.post('/register', [
  body('email').isEmail(),
  body('password').isString().isLength({ min: 6 }),
  body('displayName').isString().notEmpty(),
], validate, register);

router.post('/login', loginLimiter, [
  body('email').isEmail(),
  body('password').isString().isLength({ min: 6 })
], validate, login);

router.post('/refresh', authLimiter, [
  body('refreshToken').isString()
], validate, refresh);

router.post('/logout', authLimiter, logout);

router.post('/request-password-reset', [
  body('email').isEmail()
], validate, requestPasswordReset);

router.post('/reset-password', [
  body('token').isString(),
  body('newPassword').isString().isLength({ min: 8 })
], validate, resetPassword);

router.get('/me', authenticate, me);

export default router;
