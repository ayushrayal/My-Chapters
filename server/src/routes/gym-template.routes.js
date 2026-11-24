import { Router } from 'express';
import { GymTemplateController } from '../controllers/gym-template.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();
router.use(requireAuth);

router.get('/', asyncHandler(GymTemplateController.getTemplates));
router.post('/', asyncHandler(GymTemplateController.createTemplate));
router.get('/:id', asyncHandler(GymTemplateController.getTemplateById));
router.put('/:id', asyncHandler(GymTemplateController.updateTemplate));
router.delete('/:id', asyncHandler(GymTemplateController.deleteTemplate));

export default router;
