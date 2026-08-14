import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validators/auth.validators';
import * as authController from '../controllers/auth.controller';

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const router = Router();

router.post('/register', authLimiter, validate(registerSchema), asyncHandler(authController.register));
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(authController.login));
router.post('/refresh', asyncHandler(authController.refresh));
router.post('/logout', asyncHandler(authController.logout));

export default router;