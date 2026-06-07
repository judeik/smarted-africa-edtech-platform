import { Router } from 'express';
import {
  register,
  confirmEmail,
  login,
  refreshToken,
  logout,
  resendConfirmation,
  forgotPassword,
  resetPassword,
  setPassword,
  getMe,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  setPasswordSchema,
  resetPasswordSchema,
  forgotPasswordSchema,
  resendConfirmationSchema,
} from '../schemas/authSchemas.js';

const router = Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.get('/confirm/:token', confirmEmail);
router.post('/resend-confirmation', authLimiter, validate(resendConfirmationSchema), resendConfirmation);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', validate(resetPasswordSchema), resetPassword);
router.post('/set-password/:id', validate(setPasswordSchema), setPassword);
router.get('/me', protect, getMe);

export default router;
