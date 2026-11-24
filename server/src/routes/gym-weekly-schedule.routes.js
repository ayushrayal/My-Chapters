import { Router } from 'express';
import { GymWeeklyScheduleController } from '../controllers/gym-weekly-schedule.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(GymWeeklyScheduleController.getSchedule));
router.put('/', asyncHandler(GymWeeklyScheduleController.updateSchedule));

export default router;
