import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();
router.use(requireAuth);

router.get('/overview', asyncHandler(DashboardController.getOverview));

export default router;
