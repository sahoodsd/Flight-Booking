import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as webhookController from '../controllers/webhook.controller';

const router = Router();
router.post('/stripe', asyncHandler(webhookController.handleStripeWebhook));
export default router;