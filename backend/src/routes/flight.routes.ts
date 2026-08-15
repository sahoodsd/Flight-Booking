import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validate } from '../middleware/validate';
import { searchFlightsSchema } from '../validators/flight.validators';
import * as flightController from '../controllers/flight.controller';

const router = Router();
router.get('/search', validate(searchFlightsSchema, 'query'), asyncHandler(flightController.search));
export default router;