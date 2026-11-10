import { Router } from 'express';
import { SomedayCategoryController } from '../controllers/someday-category.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody, validateParams } from '../middleware/validate.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
  categoryIdParamSchema
} from '../validators/someday.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

// All Someday category routes require an active authenticated user session
router.use(requireAuth);

router.post(
  '/',
  validateBody(createCategorySchema),
  asyncHandler(SomedayCategoryController.createCategory)
);

router.get(
  '/',
  asyncHandler(SomedayCategoryController.getCategories)
);

router.patch(
  '/:categoryId',
  validateParams(categoryIdParamSchema),
  validateBody(updateCategorySchema),
  asyncHandler(SomedayCategoryController.updateCategory)
);

router.delete(
  '/:categoryId',
  validateParams(categoryIdParamSchema),
  asyncHandler(SomedayCategoryController.deleteCategory)
);

export default router;

