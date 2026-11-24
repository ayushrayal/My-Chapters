import { Router } from 'express';
import { DayflowTemplateController } from '../controllers/dayflow-template.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody, validateParams } from '../middleware/validate.middleware.js';
import {
  createTemplateSchema,
  updateTemplateSchema,
  templateIdParamSchema
} from '../validators/dayflow.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

// All Dayflow template routes require authenticated session
router.use(requireAuth);

router.get(
  '/',
  asyncHandler(DayflowTemplateController.getTemplates)
);

router.post(
  '/',
  validateBody(createTemplateSchema),
  asyncHandler(DayflowTemplateController.createTemplate)
);

router.get(
  '/:id',
  validateParams(templateIdParamSchema),
  asyncHandler(DayflowTemplateController.getTemplateById)
);

router.put(
  '/:id',
  validateParams(templateIdParamSchema),
  validateBody(updateTemplateSchema),
  asyncHandler(DayflowTemplateController.updateTemplate)
);

router.delete(
  '/:id',
  validateParams(templateIdParamSchema),
  asyncHandler(DayflowTemplateController.deleteTemplate)
);

export default router;
