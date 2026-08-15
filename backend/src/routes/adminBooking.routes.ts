import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { adminBookingsQuerySchema } from '../validators/booking.validators';
import * as adminBookingController from '../controllers/adminBooking.controller';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get(
  '/',
  validate(adminBookingsQuerySchema, 'query'),
  asyncHandler(adminBookingController.list),
);
router.get('/dashboard', asyncHandler(adminBookingController.dashboard));

export default router;
