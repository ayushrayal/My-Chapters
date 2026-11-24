import { Router } from 'express';
import { DayflowScheduleController } from '../controllers/dayflow-schedule.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody, validateParams } from '../middleware/validate.middleware.js';
import {
  saveScheduleSchema,
  applyTemplateSchema,
  moveScheduleSchema,
  restDaySchema,
  finishDaySchema,
  taskParamSchema
} from '../validators/dayflow.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

// All Dayflow schedule routes require authenticated session
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(DayflowScheduleController.getSchedule)
);

router.post(
  '/',
  validateBody(saveScheduleSchema),
  asyncHandler(DayflowScheduleController.saveSchedule)
);

router.post(
  '/apply-template',
  validateBody(applyTemplateSchema),
  asyncHandler(DayflowScheduleController.applyTemplate)
);

router.post(
  '/move',
  validateBody(moveScheduleSchema),
  asyncHandler(DayflowScheduleController.moveSchedule)
);

router.post(
  '/rest-day',
  validateBody(restDaySchema),
  asyncHandler(DayflowScheduleController.setRestDay)
);

router.patch(
  '/tasks/:taskId',
  validateParams(taskParamSchema),
  asyncHandler(DayflowScheduleController.updateTask)
);

router.delete(
  '/tasks/:taskId',
  validateParams(taskParamSchema),
  asyncHandler(DayflowScheduleController.deleteTask)
);

router.post(
  '/finish',
  validateBody(finishDaySchema),
  asyncHandler(DayflowScheduleController.finishDay)
);

router.get(
  '/calendar',
  asyncHandler(DayflowScheduleController.getCalendarOverview)
);

router.get(
  '/analytics',
  asyncHandler(DayflowScheduleController.getAnalytics)
);

export default router;
