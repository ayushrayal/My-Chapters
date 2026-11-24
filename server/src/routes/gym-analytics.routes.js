import { Router } from 'express';
import { GymAnalyticsController } from '../controllers/gym-analytics.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(GymAnalyticsController.getAnalytics));

export default router;
