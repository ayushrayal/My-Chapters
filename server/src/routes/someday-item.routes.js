import { Router } from 'express';
import { SomedayItemController } from '../controllers/someday-item.controller.js';
import { requireAuth } from '../middleware/auth.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware.js';
import {
  createItemSchema,
  updateItemSchema,
  itemIdParamSchema,
  getItemsQuerySchema
} from '../validators/someday.validator.js';
import { asyncHandler } from '../utils/async-handler.js';

const router = Router();

// All Someday item routes require an active authenticated user session
router.use(requireAuth);

router.post(
  '/',
  validateBody(createItemSchema),
  asyncHandler(SomedayItemController.createItem)
);

router.get(
  '/',
  validateQuery(getItemsQuerySchema),
  asyncHandler(SomedayItemController.getItems)
);

router.get(
  '/:itemId',
  validateParams(itemIdParamSchema),
  asyncHandler(SomedayItemController.getItemById)
);

router.patch(
  '/:itemId',
  validateParams(itemIdParamSchema),
  validateBody(updateItemSchema),
  asyncHandler(SomedayItemController.updateItem)
);

router.delete(
  '/:itemId',
  validateParams(itemIdParamSchema),
  asyncHandler(SomedayItemController.deleteItem)
);

export default router;

