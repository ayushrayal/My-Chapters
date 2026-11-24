import { Router } from 'express';
import { GymWorkoutSessionController } from '../controllers/gym-workout-session.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();
router.use(requireAuth);

router.get('/:date', asyncHandler(GymWorkoutSessionController.getSession));
router.post('/start', asyncHandler(GymWorkoutSessionController.startSession));
router.put('/:date', asyncHandler(GymWorkoutSessionController.updateSession));
router.delete('/:date/discard', asyncHandler(GymWorkoutSessionController.discardSession));
router.delete('/:date', asyncHandler(GymWorkoutSessionController.discardSession));
router.post('/:date/finish', asyncHandler(GymWorkoutSessionController.finishSession));
router.post('/:date/rest-day', asyncHandler(GymWorkoutSessionController.setRestDay));
router.delete('/:date/rest-day', asyncHandler(GymWorkoutSessionController.removeRestDay));
router.post('/:date/comparisons', asyncHandler(GymWorkoutSessionController.getComparisons));

export default router;
