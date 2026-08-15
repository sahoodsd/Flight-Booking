import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/requireAuth';
import { requireRole } from '../middleware/requireRole';
import { createFlightSchema, updateFlightSchema } from '../validators/flight.validators';
import * as adminFlightController from '../controllers/adminFlight.controller';

const router = Router();
router.use(requireAuth, requireRole('admin')); // everything below requires an admin token

router.post('/', validate(createFlightSchema), asyncHandler(adminFlightController.create));
router.put('/:id', validate(updateFlightSchema), asyncHandler(adminFlightController.update));
router.delete('/:id', asyncHandler(adminFlightController.remove));

export default router;