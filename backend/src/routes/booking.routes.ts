import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/requireAuth';
import { createBookingSchema } from '../validators/booking.validators';
import * as bookingController from '../controllers/booking.controller';

const bookingLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });
const router = Router();

router.post(
  '/',
  requireAuth,
  bookingLimiter,
  validate(createBookingSchema),
  asyncHandler(bookingController.create),
);
router.post('/:id/cancel', requireAuth, asyncHandler(bookingController.cancel));

export default router;
