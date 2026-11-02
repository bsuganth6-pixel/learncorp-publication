import { Router } from 'express';
import { z } from 'zod';
import {
  register, login, adminLogin, logout, logoutAll, getMe, verifyEmail, resendVerification,
  forgotPassword, validateResetToken, resetPassword, updateProfile, changePassword,
  listSessions, revokeSession,
} from '../controllers/authController';
import { protect } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  loginLimiter, loginEmailLimiter, adminLoginLimiter, adminLoginEmailLimiter, registerLimiter,
  recoveryIpLimiter, recoveryEmailLimiter, resendVerificationLimiter, tokenLimiter, passwordChangeLimiter,
} from '../middleware/rateLimiter';
import {
  registerSchema, loginSchema, adminLoginSchema, forgotPasswordSchema, tokenSchema,
  resetPasswordSchema, changePasswordSchema, updateProfileSchema,
} from '../validators/authValidators';
import { objectId } from '../validators/common';

const router = Router();

// Public
router.post('/register', registerLimiter, validate(registerSchema), register);
router.post('/login', loginLimiter, loginEmailLimiter, validate(loginSchema), login);
router.post('/admin/login', adminLoginLimiter, adminLoginEmailLimiter, validate(adminLoginSchema), adminLogin);
router.post('/logout', logout);
router.post('/verify-email', tokenLimiter, validate(tokenSchema), verifyEmail);
router.post('/forgot-password', recoveryIpLimiter, recoveryEmailLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/validate', tokenLimiter, validate(tokenSchema), validateResetToken);
router.post('/reset-password', tokenLimiter, validate(resetPasswordSchema), resetPassword);

// Signed in (any role)
router.get('/me', protect, getMe);
router.post('/logout-all', protect, logoutAll);
router.patch('/profile', protect, validate(updateProfileSchema), updateProfile);
router.post('/change-password', protect, passwordChangeLimiter, validate(changePasswordSchema), changePassword);
router.get('/sessions', protect, listSessions);
router.delete('/sessions/:id', protect, validate(z.object({ id: objectId }), 'params'), revokeSession);

// Signed in, authors only (admins don't confirm email)
router.post('/resend-verification', protect, resendVerificationLimiter, resendVerification);

export default router;
